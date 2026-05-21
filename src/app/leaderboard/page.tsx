'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

import Loader from '@/components/ui/Loader'
import { fetchJson } from '@/lib/fetch-json'

interface LeaderboardEntry {
    user_id: string
    full_name: string
    avatar_url: string
    instagram_username?: string
    total_steps: number
    quest_points: number
    overall_points: number
    dimension_points: Record<string, number>
}

interface Dimension {
    id: string
    name: string
    display_name: string
}

const fetcher = <T,>(url: string) => fetchJson<T>(url)

const METRIC_TABS = [
    { key: 'overall', label: 'Overall' },
    { key: 'steps',   label: 'Steps'   },
    { key: 'quests',  label: 'Quests'  },
] as const

type MetricTab = 'overall' | 'steps' | 'quests'

// ── Podium card (top 3) ────────────────────────────────────────────────────
function PodiumCard({
    entry,
    rank,
    pts,
    unit,
}: {
    entry: LeaderboardEntry
    rank: 1 | 2 | 3
    pts: number
    unit: string
}) {
    const cfg = {
        1: {
            order: 'order-2',
            height: 'h-28',
            ring: 'ring-2 ring-yellow-400/70',
            badge: 'bg-yellow-500 text-black',
            crown: true,
            nameSz: 'text-sm',
            ptsSz: 'text-base',
        },
        2: {
            order: 'order-1',
            height: 'h-20',
            ring: 'ring-2 ring-slate-300/50',
            badge: 'bg-slate-300 text-black',
            crown: false,
            nameSz: 'text-xs',
            ptsSz: 'text-sm',
        },
        3: {
            order: 'order-3',
            height: 'h-20',
            ring: 'ring-2 ring-amber-600/50',
            badge: 'bg-amber-600 text-white',
            crown: false,
            nameSz: 'text-xs',
            ptsSz: 'text-sm',
        },
    }[rank]

    return (
        <div className={`flex flex-col items-center gap-1 flex-1 ${cfg.order}`}>
            {cfg.crown && <span className="text-xl mb-0.5">👑</span>}
            <div className="relative">
                <img
                    src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.full_name || 'leader')}`}
                    alt={entry.full_name}
                    className={`rounded-full object-cover ${cfg.ring} ${rank === 1 ? 'w-16 h-16' : 'w-12 h-12'}`}
                />
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${cfg.badge}`}>
                    {rank}
                </span>
            </div>
            <p className={`font-bold text-white truncate max-w-[80px] text-center leading-tight mt-1 ${cfg.nameSz}`}>
                {entry.full_name.split(' ')[0]}
            </p>
            <p className={`font-mono font-extrabold text-[#FC4C02] ${cfg.ptsSz}`}>
                {pts.toLocaleString()}
                <span className="text-[9px] font-sans text-gray-500 ml-0.5">{unit}</span>
            </p>
            {/* Podium plinth */}
            <div className={`w-full rounded-t-lg mt-1 ${cfg.height} ${
                rank === 1 ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 border-t-2 border-yellow-500/40' :
                rank === 2 ? 'bg-gradient-to-b from-slate-300/10 to-slate-300/5 border-t-2 border-slate-300/30' :
                             'bg-gradient-to-b from-amber-600/10 to-amber-600/5 border-t-2 border-amber-600/30'
            }`} />
        </div>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Leaderboard() {
    const [dimensions, setDimensions]         = useState<Dimension[]>([])
    const [selectedDimension, setSelectedDimension] = useState<string>('overall')
    const [activeTab, setActiveTab]           = useState<MetricTab>('overall')
    const [dimOpen, setDimOpen]               = useState(false)
    const dimRef                              = useRef<HTMLDivElement>(null)

    const leaderboardUrl = selectedDimension === 'overall'
        ? '/api/leaderboard'
        : `/api/leaderboard?dimension=${selectedDimension}`

    const { data, error, isLoading: loading } = useSWR<{ leaderboard?: LeaderboardEntry[] }>(leaderboardUrl, fetcher, {
        revalidateOnFocus: true,
        refreshInterval: 30000,
    })

    // Current user from /api/strava/sync (reuses existing SWR cache)
    const { data: syncData } = useSWR<{ profile?: { id?: string | null } }>('/api/strava/sync', fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    })
    const currentUserId: string | null = syncData?.profile?.id ?? null

    const leaders: LeaderboardEntry[] = data?.leaderboard || []

useEffect(() => {
        fetchJson<{ dimensions?: Dimension[] }>('/api/dimensions')
            .then(d => setDimensions(d.dimensions || []))
            .catch(() => { /* silently fallback to empty dimensions */ })
    }, [])

    // Close dimension dropdown on outside click
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (dimRef.current && !dimRef.current.contains(e.target as Node)) {
                setDimOpen(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const getPoints = (entry: LeaderboardEntry) => {
        if (selectedDimension !== 'overall') return entry.dimension_points?.[selectedDimension] ?? 0
        if (activeTab === 'steps')  return entry.total_steps
        if (activeTab === 'quests') return entry.quest_points
        return entry.overall_points
    }

    const sortedLeaders = [...leaders].sort((a, b) => getPoints(b) - getPoints(a))

    const isSteps      = selectedDimension === 'overall' && activeTab === 'steps'
    const unit         = isSteps ? 'steps' : 'pts'
    const top3         = sortedLeaders.slice(0, 3)
    const rest         = sortedLeaders.length >= 3 ? sortedLeaders.slice(3) : []
    const fallbackAvatar = (name: string) =>
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'leader')}`

    const activeDimLabel = selectedDimension === 'overall'
        ? 'All Dimensions'
        : dimensions.find(d => d.id === selectedDimension)?.display_name ?? '...'

    if (loading) return <Loader text="LOADING LEADERBOARD..." />

    if (error) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
                <div className="max-w-sm rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
                    <p className="text-sm font-semibold text-red-300">Failed to load leaderboard</p>
                    <p className="mt-2 text-sm text-red-200">
                        {error instanceof Error ? error.message : 'Leaderboard data is unavailable right now.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white pb-40">
            {/* Ambient glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#FC4C02] rounded-full mix-blend-screen blur-[90px] opacity-10" />
                <div className="absolute bottom-1/3 -left-20 w-60 h-60 bg-purple-600 rounded-full mix-blend-screen blur-[90px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between pt-6 pb-4">
                    <div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#FC4C02] to-orange-400 bg-clip-text text-transparent leading-tight">
                            Leaderboard
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">Top performers</p>
                    </div>

                    {/* Dimension dropdown */}
                    <div className="relative" ref={dimRef}>
                        <button
                            onClick={() => setDimOpen(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/[0.12] text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all"
                        >
                            <svg className="w-3.5 h-3.5 text-[#FC4C02]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
                            </svg>
                            <span className="max-w-[90px] truncate">{activeDimLabel}</span>
                            <svg className={`w-3 h-3 transition-transform ${dimOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {dimOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-[#111111] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-50">
                                <button
                                    onClick={() => { setSelectedDimension('overall'); setDimOpen(false) }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDimension === 'overall' ? 'text-[#FC4C02] bg-[#FC4C02]/10' : 'text-gray-300 hover:bg-white/5'}`}
                                >
                                    All Dimensions
                                </button>
                                {dimensions.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => { setSelectedDimension(d.id); setDimOpen(false) }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDimension === d.id ? 'text-[#FC4C02] bg-[#FC4C02]/10' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        {d.display_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Podium / Compact top list when fewer than 3 ── */}
                {top3.length === 3 ? (
                    <div className="flex items-end gap-2 mb-6 px-2">
                        {([2, 1, 3] as (1|2|3)[]).map(rank => {
                            const entry = top3[rank - 1]
                            return (
                                <PodiumCard
                                    key={entry.user_id}
                                    entry={entry}
                                    rank={rank}
                                    pts={getPoints(entry)}
                                    unit={unit}
                                />
                            )
                        })}
                    </div>
                ) : top3.length > 0 ? (
                    <div className="space-y-2 mb-6">
                        {top3.map((entry, i) => {
                            const rank = i + 1
                            return (
                                <div
                                    key={entry.user_id}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white/[0.04] border-white/[0.06]"
                                >
                                    <span className="w-6 text-center text-xs font-bold text-[#FC4C02] flex-shrink-0">
                                        {rank}
                                    </span>
                                    <img
                                        src={entry.avatar_url || fallbackAvatar(entry.full_name)}
                                        alt={entry.full_name}
                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
                                    />
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-bold text-white truncate leading-tight">{entry.full_name}</p>
                                        {entry.instagram_username && (
                                            <p className="text-[11px] text-gray-500 truncate">@{entry.instagram_username}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-mono font-extrabold text-white">{getPoints(entry).toLocaleString()}</span>
                                        <span className="block text-[9px] text-gray-600 mt-0.5">{unit}</span>
                                    </div>
                                </div>
                            )
                        })}
                        <p className="text-center text-[11px] text-gray-600 pt-2">
                            Belum cukup peserta untuk memunculkan podium 3 besar.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 mb-6 text-center">
                        <p className="text-sm font-semibold text-gray-300">Leaderboard masih kosong</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Selesaikan quest atau catat kegiatan untuk masuk ke papan peringkat.
                        </p>
                    </div>
                )}

                {/* ── Metric Tabs ── */}
                {selectedDimension === 'overall' && (
                    <div className="flex bg-white/5 rounded-full p-1 mb-5 border border-white/[0.06]">
                        {METRIC_TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`flex-1 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                                    activeTab === t.key
                                        ? 'bg-[#FC4C02] text-white shadow-lg shadow-orange-500/20'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Rank 4+ list ── */}
                <div className="space-y-2">
                    {rest.map((entry, i) => {
                        const rank    = i + 4
                        const pts     = getPoints(entry)
                        const isMe    = entry.user_id === currentUserId

                        return (
                            <div
                                key={entry.user_id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                                    isMe
                                        ? 'bg-[#FC4C02]/10 border-[#FC4C02]/40'
                                        : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07]'
                                }`}
                            >
                                <span className="w-6 text-center text-xs font-bold text-gray-500 flex-shrink-0">
                                    {rank}
                                </span>
                                <img
                                    src={entry.avatar_url || fallbackAvatar(entry.full_name)}
                                    alt={entry.full_name}
                                    className={`w-9 h-9 rounded-full object-cover flex-shrink-0 ${isMe ? 'ring-2 ring-[#FC4C02]/60' : 'ring-1 ring-white/10'}`}
                                />
                                <div className="flex-grow min-w-0">
                                    <p className="text-sm font-bold text-white truncate leading-tight">
                                        {entry.full_name}
                                        {isMe && <span className="ml-1.5 text-[10px] font-semibold text-[#FC4C02] uppercase tracking-wide">You</span>}
                                    </p>
                                    {entry.instagram_username && (
                                        <p className="text-[11px] text-gray-500 truncate">@{entry.instagram_username}</p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className={`text-sm font-mono font-extrabold ${isMe ? 'text-[#FC4C02]' : 'text-white'}`}>
                                        {pts.toLocaleString()}
                                    </span>
                                    <span className="block text-[9px] text-gray-600 mt-0.5">{unit}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
