'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Activity,
    Bell,
    Brain,
    Briefcase,
    CalendarDays,
    Camera,
    ChevronRight,
    Dumbbell,
    Flame,
    Footprints,
    Gift,
    Heart,
    Medal,
    Shield,
    Sparkles,
    Trophy,
    Users,
    Zap,
} from 'lucide-react'

import AddActivityBtn from '@/components/AddActivityBtn'
import DailyQuests from '@/components/DailyQuests'
import { useNotifications, useProfile } from '@/hooks/use-swr-hooks'
import Loader from '@/components/ui/Loader'

interface Dimension {
    id: string
    name: string
    display_name: string
    icon: string
    sort_order: number
}

interface Survey {
    id: string
    title: string
    description?: string
}

interface ActivityItem {
    id: string
    type: string
    name: string
    start_date: string
    steps: number
    distance?: number | null
    mode?: string | null
    calories?: number | null
    activity_points?: number | null
    step_points?: number | null
    review_status?: string | null
    proof_url?: string | null
    source?: string | null
}

const dimensionIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    users: Users,
    sparkles: Sparkles,
    briefcase: Briefcase,
}

function toSafeNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : 0
}

function normalizeMode(activity: ActivityItem): 'daily' | 'sport' | 'event' {
    if (activity.type === 'Event') return 'event'
    if (activity.mode === 'sport' || toSafeNumber(activity.activity_points) > 0 || toSafeNumber(activity.calories) > 0) {
        return 'sport'
    }
    return 'daily'
}

function formatDistanceMeters(distance: number): string {
    if (distance >= 1000) return `${(distance / 1000).toFixed(1)} km`
    return `${Math.round(distance)} m`
}

function getReviewLabel(status: string | null | undefined): string {
    if (!status) return 'approved'
    if (status === 'voided') return 'voided'
    if (status === 'rejected') return 'rejected'
    return status
}

function getSourceLabel(source: string | null | undefined): string {
    if (source === 'strava') return 'Strava'
    if (source === 'manual') return 'Manual'
    return source ? source : 'Unknown'
}

export default function Dashboard() {
    const {
        profile,
        activities,
        quests,
        userQuests,
        surveys,
        totalPoints,
        stepPoints,
        sportPoints,
        totalPhysicalPoints,
        isLoading: profileLoading,
        mutate: mutateProfile,
    } = useProfile()
    const { unreadCount } = useNotifications()
    const router = useRouter()

    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [dimensionPoints, setDimensionPoints] = useState<Record<string, number>>({})
    const [myRank, setMyRank] = useState<number | null>(null)
    const [maxStreak, setMaxStreak] = useState<number>(0)
    const [currentTime] = useState(() => Date.now())

    const handleRefresh = () => mutateProfile()

    useEffect(() => {
        fetch('/api/dimensions')
            .then((response) => response.json())
            .then((data) => setDimensions(data.dimensions || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!profile) return

        fetch('/api/leaderboard')
            .then((response) => response.json())
            .then((data) => {
                const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : []
                const sorted = leaderboard.sort((left: { overall_points: number }, right: { overall_points: number }) => right.overall_points - left.overall_points)
                const index = sorted.findIndex((entry: { user_id: string }) => entry.user_id === profile.id)
                if (index !== -1) setMyRank(index + 1)
                const me = index === -1 ? null : sorted[index]
                if (me?.dimension_points) setDimensionPoints(me.dimension_points)
            })
            .catch(() => {})
    }, [profile])

    useEffect(() => {
        fetch('/api/streaks')
            .then((response) => response.json())
            .then((data) => {
                const streaks = Object.values(data.streaks || {}) as { current_streak: number }[]
                const max = streaks.reduce((accumulator, streak) => Math.max(accumulator, streak.current_streak), 0)
                setMaxStreak(max)
            })
            .catch(() => {})
    }, [])

    const sortedQuests = [...quests].sort((left: { id: string; expires_at?: string | null; created_at?: string | null }, right: { id: string; expires_at?: string | null; created_at?: string | null }) => {
        const leftCompleted = userQuests.some((userQuest: { quest_id: string }) => userQuest.quest_id === left.id)
        const rightCompleted = userQuests.some((userQuest: { quest_id: string }) => userQuest.quest_id === right.id)
        if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1

        const leftHasExpiry = left.expires_at ? 0 : 1
        const rightHasExpiry = right.expires_at ? 0 : 1
        if (leftHasExpiry !== rightHasExpiry) return leftHasExpiry - rightHasExpiry

        return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    })

    const actionableQuests = sortedQuests.filter((quest: { id: string; expires_at?: string | null }) => {
        const isCompleted = userQuests.some((userQuest: { quest_id: string }) => userQuest.quest_id === quest.id)
        if (!quest.expires_at) return true
        const isExpired = Date.parse(quest.expires_at) - currentTime <= 0
        return !isExpired || isCompleted
    })

    const completedQuests = actionableQuests.filter((quest: { id: string }) =>
        userQuests.some((userQuest: { quest_id: string }) => userQuest.quest_id === quest.id)
    ).length
    const totalQuests = actionableQuests.length
    const questPercent = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0
    const maxDimPoints = Math.max(100, ...Object.values(dimensionPoints).filter((value) => value > 0))
    const dashboardActivities = activities as ActivityItem[]

    if (profileLoading && !profile) {
        return <Loader text="LOADING DASHBOARD..." />
    }

    return (
        <div className="h-[100dvh] overflow-y-auto bg-black text-white pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FC4C02] rounded-full mix-blend-screen blur-[120px] opacity-10" />
                <div className="absolute bottom-1/3 -left-24 w-64 h-64 bg-[#FC4C02] rounded-full mix-blend-screen blur-[120px] opacity-[0.06]" />
            </div>

            {profile && (
                <div className="relative z-10 max-w-lg mx-auto px-4">
                    <div className="sticky top-0 z-50 flex items-center justify-between bg-black/85 backdrop-blur-xl py-3 -mx-4 px-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img
                                    src={profile.profile}
                                    alt={profile.username}
                                    className="w-10 h-10 rounded-full border-2 border-[#FC4C02] object-cover"
                                />
                                {maxStreak > 0 && (
                                    <span className="absolute -bottom-1 -right-1 bg-[#FC4C02] rounded-full w-4 h-4 flex items-center justify-center">
                                        <Flame size={9} className="text-white" />
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-tight">
                                    {profile.firstname} {profile.lastname}
                                </p>
                                <p className="text-[11px] text-gray-500">@{profile.username}</p>
                            </div>
                            {profile.username === 'admin_wam' && (
                                <button
                                    onClick={() => router.push('/dashboard/admin')}
                                    className="ml-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold text-white transition-colors flex items-center gap-1"
                                >
                                    <Shield size={10} /> Admin
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => router.push('/notifications')}
                            className="relative p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-black">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5 mb-5">
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Trophy size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {(totalPoints || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Points</span>
                        </div>
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Medal size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {myRank ? `#${myRank}` : '—'}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Rank</span>
                        </div>
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Footprints size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {toSafeNumber(stepPoints).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Step Points</span>
                        </div>
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Flame size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {toSafeNumber(sportPoints).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Sport Points</span>
                        </div>
                    </div>

                    <div className="mb-5 rounded-2xl border border-[#FC4C02]/20 bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FC4C02]">Physical</p>
                                <p className="mt-1 text-2xl font-mono font-extrabold text-white">
                                    {toSafeNumber(totalPhysicalPoints || dimensionPoints.physical).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">Daily steps + sport sessions + physical quest points</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Longest streak</p>
                                <p className="text-lg font-mono font-bold text-white">{maxStreak > 0 ? maxStreak : '—'}</p>
                            </div>
                        </div>
                    </div>

                    {surveys.length > 0 && (
                        <div className="mb-5 space-y-3">
                            {surveys.map((survey: Survey) => (
                                <div
                                    key={survey.id}
                                    className="relative overflow-hidden rounded-2xl border border-[#FC4C02]/30 bg-gradient-to-r from-[#FC4C02]/10 to-transparent p-4 flex items-center justify-between"
                                >
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-[#FC4C02] rounded-full blur-[60px] opacity-10 pointer-events-none" />
                                    <div className="min-w-0 pr-3">
                                        <p className="text-xs font-bold text-[#FC4C02] uppercase tracking-wide mb-0.5">Assessment</p>
                                        <p className="text-sm font-bold text-white truncate">{survey.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{survey.description || 'Get your personalized insights'}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/survey/${survey.id}`)}
                                        className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#FC4C02] text-white text-xs font-bold hover:bg-orange-600 transition-colors"
                                    >
                                        Start
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalQuests > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Gift size={16} className="text-[#FC4C02]" />
                                    <span className="text-sm font-bold text-white">Quests</span>
                                    <span className="text-xs text-gray-500 font-mono">
                                        {completedQuests}/{totalQuests}
                                    </span>
                                </div>
                                <Link href="/quests" className="text-[11px] text-gray-500 hover:text-white flex items-center gap-0.5 transition-colors">
                                    View All <ChevronRight size={12} />
                                </Link>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-gradient-to-r from-[#FC4C02] to-orange-400 rounded-full transition-all duration-700"
                                    style={{ width: `${questPercent}%` }}
                                />
                            </div>
                            <DailyQuests
                                quests={actionableQuests}
                                userQuests={userQuests}
                                onClaim={handleRefresh}
                                hideHeader
                            />
                        </div>
                    )}

                    {dimensions.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Zap size={15} className="text-[#FC4C02]" />
                                    <span className="text-sm font-bold text-white">Life Mode</span>
                                </div>
                                <Link href="/leaderboard" className="text-[11px] text-gray-500 hover:text-white flex items-center gap-0.5 transition-colors">
                                    Leaderboard <ChevronRight size={12} />
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {dimensions.map((dimension) => {
                                    const points = dimensionPoints[dimension.id] || 0
                                    const percent = maxDimPoints > 0 ? Math.min((points / maxDimPoints) * 100, 100) : 0
                                    const IconComp = dimensionIconMap[dimension.icon] || Activity
                                    const hasPoints = points > 0

                                    return (
                                        <div
                                            key={dimension.id}
                                            className={`relative overflow-hidden rounded-2xl p-3 border flex flex-col gap-1.5 transition-colors ${
                                                hasPoints ? 'bg-[#FC4C02]/8 border-[#FC4C02]/25' : 'bg-white/[0.03] border-white/[0.07]'
                                            }`}
                                        >
                                            {hasPoints && (
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-t from-[#FC4C02]/10 to-transparent pointer-events-none"
                                                    style={{ opacity: 0.3 + (percent / 100) * 0.7 }}
                                                />
                                            )}
                                            <IconComp
                                                size={16}
                                                className={`relative z-10 ${hasPoints ? 'text-[#FC4C02]' : 'text-gray-600'}`}
                                            />
                                            <p className="relative z-10 text-[10px] text-gray-400 leading-tight truncate">
                                                {dimension.display_name}
                                            </p>
                                            <p className={`relative z-10 text-sm font-mono font-extrabold leading-none ${hasPoints ? 'text-white' : 'text-gray-600'}`}>
                                                {points > 0 ? points.toLocaleString() : '0'}
                                            </p>
                                            <div className="relative z-10 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#FC4C02] rounded-full transition-all duration-500"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {dashboardActivities.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarDays size={15} className="text-[#FC4C02]" />
                                <h2 className="text-sm font-bold text-white">Recent Activities</h2>
                            </div>
                            <div className="space-y-2">
                                {dashboardActivities.map((activity) => {
                                    const mode = normalizeMode(activity)
                                    const isEvent = mode === 'event'
                                    const isSport = mode === 'sport'
                                    const status = getReviewLabel(activity.review_status)
                                    const sourceLabel = getSourceLabel(activity.source)
                                    const distance = toSafeNumber(activity.distance)

                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 hover:bg-white/[0.07] transition-colors"
                                        >
                                            <div
                                                className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    isEvent ? 'bg-yellow-500/20' : isSport ? 'bg-orange-500/20' : 'bg-[#FC4C02]/20'
                                                }`}
                                            >
                                                {isEvent ? (
                                                    <Trophy size={14} className="text-yellow-500" />
                                                ) : isSport ? (
                                                    <Dumbbell size={14} className="text-orange-300" />
                                                ) : (
                                                    <Footprints size={14} className="text-[#FC4C02]" />
                                                )}
                                            </div>

                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`text-sm font-bold truncate leading-tight ${isEvent ? 'text-yellow-400' : 'text-white'}`}>
                                                        {activity.name}
                                                    </p>
                                                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide text-gray-400">
                                                        {isEvent ? 'Event' : isSport ? 'Sport' : 'Daily'}
                                                    </span>
                                                    {isSport && (
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                                                                activity.source === 'strava'
                                                                    ? 'bg-[#FC4C02]/15 text-[#FC4C02]'
                                                                    : 'bg-white/10 text-gray-300'
                                                            }`}
                                                        >
                                                            {sourceLabel}
                                                        </span>
                                                    )}
                                                    {isSport && (
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                                                                status === 'voided' || status === 'rejected'
                                                                    ? 'bg-red-500/10 text-red-300'
                                                                    : 'bg-green-500/10 text-green-300'
                                                            }`}
                                                        >
                                                            {status}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {new Date(activity.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    <span className="ml-2 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{activity.type}</span>
                                                </p>
                                                {isSport && (
                                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                                        <span>{toSafeNumber(activity.calories).toLocaleString()} cal</span>
                                                        {distance > 0 && <span>{formatDistanceMeters(distance)}</span>}
                                                        {activity.source === 'strava' && toSafeNumber(activity.activity_points ?? activity.calories) === 0 && (
                                                            <span className="text-gray-500">synced without calories</span>
                                                        )}
                                                        {activity.proof_url && (
                                                            <a
                                                                href={activity.proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200"
                                                            >
                                                                <Camera size={11} />
                                                                Proof
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-sm font-mono font-extrabold ${isEvent ? 'text-yellow-400' : isSport ? 'text-orange-300' : 'text-[#FC4C02]'}`}>
                                                    {isEvent
                                                        ? toSafeNumber(activity.steps).toLocaleString()
                                                        : isSport
                                                            ? toSafeNumber(activity.activity_points ?? activity.calories).toLocaleString()
                                                            : toSafeNumber(activity.steps).toLocaleString()}
                                                </p>
                                                <p className="text-[9px] text-gray-600 uppercase tracking-wide">
                                                    {isEvent ? 'pts' : isSport ? 'sport pts' : 'steps'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AddActivityBtn />
        </div>
    )
}
