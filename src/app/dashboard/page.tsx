'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile, useNotifications } from '@/hooks/use-swr-hooks'
import AddActivityBtn from '@/components/AddActivityBtn'
import DailyQuests from '@/components/DailyQuests'
import { Activity, Bell, Footprints, Trophy, Heart, Brain, Sparkles, Briefcase, Users, ChevronRight, Gift, Flame, BarChart2, Medal, ClipboardList, Zap, CalendarDays, Shield } from 'lucide-react'
import Link from 'next/link'
import Loader from '@/components/ui/Loader'

interface Dimension {
    id: string
    name: string
    display_name: string
    icon: string
    sort_order: number
}

const dimensionIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    users: Users,
    sparkles: Sparkles,
    briefcase: Briefcase,
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
}

export default function Dashboard() {
    const { profile, activities, quests, userQuests, surveys, totalPoints, isLoading: profileLoading, mutate: mutateProfile } = useProfile()
    const { unreadCount } = useNotifications()
    const router = useRouter()

    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [dimensionPoints, setDimensionPoints] = useState<Record<string, number>>({})
    const [myRank, setMyRank] = useState<number | null>(null)
    const [maxStreak, setMaxStreak] = useState<number>(0)

    const handleRefresh = () => mutateProfile()

    // Fetch dimensions
    useEffect(() => {
        fetch('/api/dimensions')
            .then(r => r.json())
            .then(d => setDimensions(d.dimensions || []))
            .catch(() => {})
    }, [])

    // Fetch rank + dimension points from leaderboard
    useEffect(() => {
        if (!profile) return
        fetch('/api/leaderboard')
            .then(r => r.json())
            .then(data => {
                const sorted = (data.leaderboard || []).sort((a: any, b: any) => b.overall_points - a.overall_points)
                const idx = sorted.findIndex((e: any) => e.user_id === profile.id)
                if (idx !== -1) setMyRank(idx + 1)
                const me = sorted[idx]
                if (me?.dimension_points) setDimensionPoints(me.dimension_points)
            })
            .catch(() => {})
    }, [profile])

    // Fetch max streak
    useEffect(() => {
        fetch('/api/streaks')
            .then(r => r.json())
            .then(d => {
                const streaks = Object.values(d.streaks || {}) as { current_streak: number }[]
                const max = streaks.reduce((acc, s) => Math.max(acc, s.current_streak), 0)
                setMaxStreak(max)
            })
            .catch(() => {})
    }, [])

    // Quest progress — semua quest aktif, sort: harian (expires_at) dulu, lalu permanent
    const sortedQuests = [...quests].sort((a: any, b: any) => {
        const aCompleted = userQuests.some((uq: any) => uq.quest_id === a.id)
        const bCompleted = userQuests.some((uq: any) => uq.quest_id === b.id)
        // Selesai ke bawah
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
        // Dalam grup: yang punya expires_at (daily) di atas, lalu by created_at terbaru
        const aHasExpiry = a.expires_at ? 0 : 1
        const bHasExpiry = b.expires_at ? 0 : 1
        if (aHasExpiry !== bHasExpiry) return aHasExpiry - bHasExpiry
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

    // Exclude expired+uncompleted from counter (can't be done anymore)
    const actionableQuests = sortedQuests.filter((q: any) => {
        const isCompleted = userQuests.some((uq: any) => uq.quest_id === q.id)
        if (!q.expires_at) return true
        const isExpired = Date.parse(q.expires_at) - Date.now() <= 0
        return !isExpired || isCompleted
    })
    const completedQuests = actionableQuests.filter((q: any) =>
        userQuests.some((uq: any) => uq.quest_id === q.id)
    ).length
    const totalQuests = actionableQuests.length
    const questPercent = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0

    // Dimension max for % bar
    const maxDimPoints = Math.max(100, ...Object.values(dimensionPoints).filter(v => v > 0))

    if (profileLoading && !profile) {
        return <Loader text="LOADING DASHBOARD..." />
    }

    return (
        <div className="h-[100dvh] overflow-y-auto bg-black text-white pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Ambient glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FC4C02] rounded-full mix-blend-screen blur-[120px] opacity-10" />
                <div className="absolute bottom-1/3 -left-24 w-64 h-64 bg-[#FC4C02] rounded-full mix-blend-screen blur-[120px] opacity-[0.06]" />
            </div>

            {profile && (
                <div className="relative z-10 max-w-lg mx-auto px-4">

                    {/* ── Sticky Header ── */}
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

                    {/* ── 3 Stat Chips ── */}
                    <div className="grid grid-cols-3 gap-3 mt-5 mb-5">
                        {/* Total Points */}
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Trophy size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {(totalPoints || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Points</span>
                        </div>
                        {/* Rank */}
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Medal size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {myRank ? `#${myRank}` : '—'}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Rank</span>
                        </div>
                        {/* Streak */}
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center gap-0.5">
                            <Flame size={16} className="text-[#FC4C02] mb-0.5" />
                            <span className="text-base font-mono font-extrabold text-white leading-none">
                                {maxStreak > 0 ? maxStreak : '—'}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Streak</span>
                        </div>
                    </div>

                    {/* ── Survey CTA ── */}
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

                    {/* ── Daily Quests ── */}
                    {totalQuests > 0 && (
                        <div className="mb-5">
                            {/* Header with progress */}
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
                            {/* Progress bar */}
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

                    {/* ── Life Mode — Dimension Grid ── */}
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
                                {dimensions.map(dim => {
                                    const points = dimensionPoints[dim.id] || 0
                                    const percent = maxDimPoints > 0 ? Math.min((points / maxDimPoints) * 100, 100) : 0
                                    const IconComp = dimensionIconMap[dim.icon] || Activity
                                    const hasPoints = points > 0

                                    return (
                                        <div
                                            key={dim.id}
                                            className={`relative overflow-hidden rounded-2xl p-3 border flex flex-col gap-1.5 transition-colors ${
                                                hasPoints
                                                    ? 'bg-[#FC4C02]/8 border-[#FC4C02]/25'
                                                    : 'bg-white/[0.03] border-white/[0.07]'
                                            }`}
                                        >
                                            {/* Background fill based on progress */}
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
                                                {dim.display_name}
                                            </p>
                                            <p className={`relative z-10 text-sm font-mono font-extrabold leading-none ${hasPoints ? 'text-white' : 'text-gray-600'}`}>
                                                {points > 0 ? points.toLocaleString() : '0'}
                                            </p>
                                            {/* Mini bar */}
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

                    {/* ── Recent Activities ── */}
                    {activities.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarDays size={15} className="text-[#FC4C02]" />
                                <h2 className="text-sm font-bold text-white">Recent Activities</h2>
                            </div>
                            <div className="space-y-2">
                                {activities.map((activity: ActivityItem) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 hover:bg-white/[0.07] transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            activity.type === 'Event' ? 'bg-yellow-500/20' : 'bg-[#FC4C02]/20'
                                        }`}>
                                            {activity.type === 'Event'
                                                ? <Trophy size={14} className="text-yellow-500" />
                                                : <Footprints size={14} className="text-[#FC4C02]" />
                                            }
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className={`text-sm font-bold truncate leading-tight ${
                                                activity.type === 'Event' ? 'text-yellow-400' : 'text-white'
                                            }`}>
                                                {activity.name}
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {new Date(activity.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                <span className="ml-2 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{activity.type}</span>
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-sm font-mono font-extrabold ${
                                                activity.type === 'Event' ? 'text-yellow-400' : 'text-[#FC4C02]'
                                            }`}>
                                                {activity.steps > 0 ? activity.steps.toLocaleString() : '—'}
                                            </p>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-wide">
                                                {activity.type === 'Event' ? 'pts' : 'steps'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
            <AddActivityBtn />
        </div>
    )
}
