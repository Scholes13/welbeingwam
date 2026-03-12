'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Activity,
    Bell,
    Brain,
    Briefcase,
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
    TrendingUp,
    Trophy,
    Users,
    Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'

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

const dimensionColorMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    activity: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'from-orange-500/15' },
    heart: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'from-rose-500/15' },
    brain: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', glow: 'from-violet-500/15' },
    users: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', glow: 'from-sky-500/15' },
    sparkles: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'from-amber-500/15' },
    briefcase: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'from-emerald-500/15' },
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

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
}

/* Animated counter hook */
function useCountUp(target: number, duration = 1200) {
    const [value, setValue] = useState(0)
    const ref = useRef(0)
    useEffect(() => {
        if (target === ref.current) return
        const start = ref.current
        const diff = target - start
        const startTime = performance.now()
        const step = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = Math.round(start + diff * eased)
            setValue(current)
            if (progress < 1) requestAnimationFrame(step)
            else ref.current = target
        }
        requestAnimationFrame(step)
    }, [target, duration])
    return value
}

/* Stagger animation variants */
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
}

/* ── Section header component ── */
function SectionHeader({ icon: Icon, title, trailing }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; trailing?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FC4C02]/15 flex items-center justify-center">
                    <Icon size={14} className="text-[#FC4C02]" />
                </div>
                <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
            </div>
            {trailing}
        </div>
    )
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
    const [dimensionsLoading, setDimensionsLoading] = useState(true)
    const [dimensionPoints, setDimensionPoints] = useState<Record<string, number>>({})
    const [myRank, setMyRank] = useState<number | null>(null)
    const [maxStreak, setMaxStreak] = useState<number>(0)
    const [currentTime] = useState(() => Date.now())

    /* animated counters */
    const animPoints = useCountUp(totalPoints || 0)
    const animStep = useCountUp(toSafeNumber(stepPoints))
    const animSport = useCountUp(toSafeNumber(sportPoints))
    const animPhysical = useCountUp(toSafeNumber(totalPhysicalPoints || dimensionPoints.physical))

    const handleRefresh = () => mutateProfile()

    useEffect(() => {
        let retries = 0
        const fetchDimensions = () => {
            fetch('/api/dimensions')
                .then((response) => response.json())
                .then((data) => {
                    const dims = data.dimensions || []
                    setDimensions(dims)
                    setDimensionsLoading(false)
                    // Retry if empty (API might not be ready yet)
                    if (dims.length === 0 && retries < 3) {
                        retries++
                        setTimeout(fetchDimensions, 1500 * retries)
                    }
                })
                .catch(() => {
                    if (retries < 3) {
                        retries++
                        setTimeout(fetchDimensions, 1500 * retries)
                    } else {
                        setDimensionsLoading(false)
                    }
                })
        }
        fetchDimensions()
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
        <div className="h-[100dvh] overflow-y-auto bg-[#0A0A0A] text-white pb-36 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* ── Ambient background glows ── */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FC4C02] rounded-full blur-[160px] opacity-[0.07]" />
                <div className="absolute top-1/2 -left-32 w-72 h-72 bg-[#FC4C02] rounded-full blur-[140px] opacity-[0.04]" />
            </div>

            {profile && (
                <motion.div
                    className="relative z-10 max-w-lg mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {/* ── Sticky Header ── */}
                    <div className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-2xl border-b border-white/[0.06]">
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img
                                        src={profile.profile}
                                        alt={profile.username}
                                        className="w-11 h-11 rounded-full ring-2 ring-[#FC4C02]/40 ring-offset-2 ring-offset-[#0A0A0A] object-cover"
                                    />
                                    {maxStreak > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                            <Flame size={10} className="text-white" />
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-white leading-tight tracking-tight">
                                        {getGreeting()}, {profile.firstname}!
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">@{profile.username}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {profile.username === 'admin_wam' && (
                                    <button
                                        onClick={() => router.push('/dashboard/admin')}
                                        className="p-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Shield size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/notifications')}
                                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="px-5">
                        {/* ── Hero Stats Card ── */}
                        <motion.div variants={itemVariants} className="mt-5 mb-6">
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FC4C02]/20 via-[#1A1008] to-[#0F0F0F] border border-[#FC4C02]/15 p-5">
                                {/* decorative arc */}
                                <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#FC4C02] rounded-full blur-[80px] opacity-[0.12] pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FC4C02]/20 to-transparent" />

                                {/* Top row: total points hero */}
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#FC4C02]/80 mb-1">Total Points</p>
                                        <p className="text-4xl font-mono font-black text-white leading-none tracking-tighter">
                                            {animPoints.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-full px-3 py-1.5">
                                            <Medal size={13} className="text-[#FC4C02]" />
                                            <span className="text-sm font-bold font-mono text-white">
                                                {myRank ? `#${myRank}` : '—'}
                                            </span>
                                        </div>
                                        {maxStreak > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-orange-300/70">
                                                <Flame size={11} />
                                                <span className="font-mono font-bold">{maxStreak}d streak</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sub-stats row */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/[0.04] rounded-2xl p-3 text-center">
                                        <Footprints size={14} className="text-[#FC4C02]/70 mx-auto mb-1.5" />
                                        <p className="text-lg font-mono font-bold text-white leading-none">
                                            {animStep.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Steps</p>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-2xl p-3 text-center">
                                        <Dumbbell size={14} className="text-[#FC4C02]/70 mx-auto mb-1.5" />
                                        <p className="text-lg font-mono font-bold text-white leading-none">
                                            {animSport.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Sport</p>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-2xl p-3 text-center">
                                        <TrendingUp size={14} className="text-[#FC4C02]/70 mx-auto mb-1.5" />
                                        <p className="text-lg font-mono font-bold text-white leading-none">
                                            {animPhysical.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Physical</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* ── Surveys / Assessment Banner ── */}
                        {surveys.length > 0 && (
                            <motion.div variants={itemVariants} className="mb-6 space-y-3">
                                {surveys.map((survey: Survey) => (
                                    <div
                                        key={survey.id}
                                        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FC4C02]/15 via-[#FC4C02]/5 to-transparent border border-[#FC4C02]/20 p-4 flex items-center justify-between group cursor-pointer hover:border-[#FC4C02]/40 transition-colors"
                                        onClick={() => router.push(`/survey/${survey.id}`)}
                                    >
                                        <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#FC4C02] rounded-full blur-[50px] opacity-[0.08] group-hover:opacity-[0.15] transition-opacity pointer-events-none" />
                                        <div className="min-w-0 pr-4">
                                            <p className="text-[10px] font-bold text-[#FC4C02] uppercase tracking-[0.15em] mb-1">Assessment Available</p>
                                            <p className="text-sm font-bold text-white truncate">{survey.title}</p>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{survey.description || 'Get your personalized insights'}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-[#FC4C02]/60 flex-shrink-0 group-hover:text-[#FC4C02] group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* ── Quests Section ── */}
                        {totalQuests > 0 && (
                            <motion.div variants={itemVariants} className="mb-8">
                                <SectionHeader
                                    icon={Gift}
                                    title="Quests"
                                    trailing={
                                        <Link href="/quests" className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FC4C02] transition-colors">
                                            <span className="font-mono font-bold text-white/60">{completedQuests}/{totalQuests}</span>
                                            <ChevronRight size={14} />
                                        </Link>
                                    }
                                />
                                {/* Progress bar */}
                                <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden mb-5">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FC4C02] to-orange-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${questPercent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                    />
                                    {/* Glow on tip */}
                                    <motion.div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FC4C02] rounded-full blur-sm"
                                        initial={{ left: 0 }}
                                        animate={{ left: `${questPercent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                    />
                                </div>
                                <DailyQuests
                                    quests={actionableQuests}
                                    userQuests={userQuests}
                                    onClaim={handleRefresh}
                                    hideHeader
                                />
                            </motion.div>
                        )}

                        {/* ── Life Mode Dimensions ── */}
                        <motion.div variants={itemVariants} className="mb-8">
                            <SectionHeader
                                icon={Zap}
                                title="Life Mode"
                                trailing={
                                    <Link href="/leaderboard" className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FC4C02] transition-colors">
                                        Leaderboard <ChevronRight size={14} />
                                    </Link>
                                }
                            />

                            {dimensionsLoading ? (
                                /* Skeleton loader while fetching */
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 animate-pulse">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 w-20 bg-white/[0.06] rounded" />
                                                    <div className="h-4 w-12 bg-white/[0.06] rounded" />
                                                </div>
                                            </div>
                                            <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : dimensions.length === 0 ? (
                                /* Empty state — never fully hide */
                                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
                                    <Zap size={24} className="mx-auto text-gray-600 mb-2" />
                                    <p className="text-sm text-gray-500">Life Mode dimensions loading...</p>
                                    <p className="text-xs text-gray-600 mt-1">Pull to refresh if this persists</p>
                                </div>
                            ) : (
                                /* ── Sporty 2-col cards ── */
                                <div className="grid grid-cols-2 gap-3">
                                    {dimensions.map((dimension, idx) => {
                                        const points = dimensionPoints[dimension.id] || 0
                                        const percent = maxDimPoints > 0 ? Math.min((points / maxDimPoints) * 100, 100) : 0
                                        const IconComp = dimensionIconMap[dimension.icon] || Activity
                                        const colors = dimensionColorMap[dimension.icon] || dimensionColorMap.activity
                                        const hasPoints = points > 0

                                        return (
                                            <motion.div
                                                key={dimension.id}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                                                whileTap={{ scale: 0.97 }}
                                                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                                                    hasPoints
                                                        ? `${colors.bg} ${colors.border}`
                                                        : 'bg-white/[0.03] border-white/[0.06]'
                                                }`}
                                            >
                                                {/* Ambient glow for active cards */}
                                                {hasPoints && (
                                                    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${colors.glow} to-transparent pointer-events-none`} />
                                                )}

                                                <div className="relative z-10 p-4">
                                                    {/* Top row: Icon badge + Points */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-300 ${
                                                            hasPoints
                                                                ? `${colors.bg} ring-1 ring-inset ${colors.border}`
                                                                : 'bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]'
                                                        }`}>
                                                            <IconComp
                                                                size={20}
                                                                className={`transition-colors duration-300 ${hasPoints ? colors.text : 'text-gray-600'}`}
                                                            />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-lg font-mono font-black leading-none tracking-tight ${
                                                                hasPoints ? 'text-white' : 'text-gray-600'
                                                            }`}>
                                                                {points > 0 ? points.toLocaleString() : '—'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-600 font-medium mt-0.5 uppercase tracking-wider">
                                                                pts
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Dimension name */}
                                                    <p className={`text-[13px] font-semibold leading-tight mb-3 ${
                                                        hasPoints ? 'text-gray-200' : 'text-gray-500'
                                                    }`}>
                                                        {dimension.display_name}
                                                    </p>

                                                    {/* Progress bar — thicker, with animated fill */}
                                                    <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={`absolute inset-y-0 left-0 rounded-full ${
                                                                hasPoints
                                                                    ? `bg-gradient-to-r ${colors.glow.replace('from-', 'from-').replace('/15', '/80')} to-white/20`
                                                                    : ''
                                                            }`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percent}%` }}
                                                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + idx * 0.08 }}
                                                        />
                                                        {/* Glow dot at tip */}
                                                        {hasPoints && percent > 5 && (
                                                            <motion.div
                                                                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full blur-sm ${colors.text.replace('text-', 'bg-')}`}
                                                                initial={{ left: 0 }}
                                                                animate={{ left: `${percent}%` }}
                                                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + idx * 0.08 }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}
                        </motion.div>

                        {/* ── Recent Activities ── */}
                        {dashboardActivities.length > 0 && (
                            <motion.div variants={itemVariants} className="mb-8">
                                <SectionHeader icon={Trophy} title="Recent Activities" />
                                <div className="space-y-2.5">
                                    {dashboardActivities.map((activity, index) => {
                                        const mode = normalizeMode(activity)
                                        const isEvent = mode === 'event'
                                        const isSport = mode === 'sport'
                                        const status = getReviewLabel(activity.review_status)
                                        const sourceLabel = getSourceLabel(activity.source)
                                        const distance = toSafeNumber(activity.distance)

                                        return (
                                            <motion.div
                                                key={activity.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-start gap-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
                                            >
                                                <div
                                                    className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        isEvent ? 'bg-yellow-500/15' : isSport ? 'bg-orange-500/15' : 'bg-[#FC4C02]/10'
                                                    }`}
                                                >
                                                    {isEvent ? (
                                                        <Trophy size={15} className="text-yellow-400" />
                                                    ) : isSport ? (
                                                        <Dumbbell size={15} className="text-orange-300" />
                                                    ) : (
                                                        <Footprints size={15} className="text-[#FC4C02]" />
                                                    )}
                                                </div>

                                                <div className="flex-grow min-w-0">
                                                    <p className={`text-sm font-bold truncate leading-tight ${isEvent ? 'text-yellow-400' : 'text-white'}`}>
                                                        {activity.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(activity.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                                            isEvent ? 'bg-yellow-500/10 text-yellow-400' : isSport ? 'bg-orange-500/10 text-orange-300' : 'bg-white/[0.06] text-gray-400'
                                                        }`}>
                                                            {isEvent ? 'Event' : isSport ? 'Sport' : 'Daily'}
                                                        </span>
                                                        {isSport && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                                                activity.source === 'strava' ? 'bg-[#FC4C02]/10 text-[#FC4C02]' : 'bg-white/[0.06] text-gray-400'
                                                            }`}>
                                                                {sourceLabel}
                                                            </span>
                                                        )}
                                                        {isSport && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                                                status === 'voided' || status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                                            }`}>
                                                                {status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isSport && (
                                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                                            <span>{toSafeNumber(activity.calories).toLocaleString()} cal</span>
                                                            {distance > 0 && <span>{formatDistanceMeters(distance)}</span>}
                                                            {activity.proof_url && (
                                                                <a
                                                                    href={activity.proof_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                                                                >
                                                                    <Camera size={11} />
                                                                    Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right flex-shrink-0 pt-0.5">
                                                    <p className={`text-base font-mono font-black ${isEvent ? 'text-yellow-400' : isSport ? 'text-orange-300' : 'text-[#FC4C02]'}`}>
                                                        {isEvent
                                                            ? toSafeNumber(activity.steps).toLocaleString()
                                                            : isSport
                                                                ? toSafeNumber(activity.activity_points ?? activity.calories).toLocaleString()
                                                                : toSafeNumber(activity.steps).toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">
                                                        {isEvent ? 'pts' : isSport ? 'sport pts' : 'steps'}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}

            <AddActivityBtn />
        </div>
    )
}
