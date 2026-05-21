'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    ArrowLeft, Camera, ChevronLeft, ChevronRight, Dumbbell,
    Footprints, Trophy,
} from 'lucide-react'

import { useProfile } from '@/hooks/use-swr-hooks'

// ---------------------------------------------------------------------------
// Types & helpers (kept local; mirrors dashboard/page.tsx shape)
// ---------------------------------------------------------------------------

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
    review_status?: string | null
    proof_url?: string | null
    proof_urls?: string[] | null
    source?: string | null
}

const PAGE_SIZE = 10

function toSafeNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : 0
}

function normalizeMode(activity: ActivityItem): 'daily' | 'sport' | 'event' {
    if (activity.type === 'Event') return 'event'
    if (
        activity.mode === 'sport' ||
        toSafeNumber(activity.activity_points) > 0 ||
        toSafeNumber(activity.calories) > 0
    ) {
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

type FilterValue = 'all' | 'daily' | 'sport' | 'event'

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'daily', label: 'Daily' },
    { value: 'sport', label: 'Sport' },
    { value: 'event', label: 'Event' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
    const { activities, isLoading } = useProfile()
    const [filter, setFilter] = useState<FilterValue>('all')
    const [page, setPage] = useState(1)

    const allActivities = (activities || []) as ActivityItem[]

    const filteredActivities = useMemo(() => {
        if (filter === 'all') return allActivities
        return allActivities.filter((activity) => normalizeMode(activity) === filter)
    }, [allActivities, filter])

    const totalPages = Math.max(1, Math.ceil(filteredActivities.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    const visible = filteredActivities.slice(start, start + PAGE_SIZE)

    const handleFilter = (value: FilterValue) => {
        setFilter(value)
        setPage(1)
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-12">
            {/* Sticky header */}
            <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0a0a]/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
                    <Link
                        href="/dashboard"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-gray-400 transition-colors hover:border-white/[0.12] hover:text-white"
                        aria-label="Kembali ke dashboard"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">History</p>
                        <h1 className="text-lg font-bold leading-tight">Riwayat Kegiatan</h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-5 pt-5">
                {/* Filter tabs */}
                <div className="mb-5 flex flex-wrap gap-2">
                    {FILTERS.map((tab) => {
                        const active = tab.value === filter
                        return (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => handleFilter(tab.value)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${
                                    active
                                        ? 'bg-[#FC4C02] text-white shadow-lg shadow-[#FC4C02]/20'
                                        : 'border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-white/[0.12] hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Body */}
                {isLoading ? (
                    <div className="space-y-2.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-20 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                            />
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
                        <Trophy size={28} className="mx-auto mb-3 text-gray-600" />
                        <p className="text-sm font-medium text-gray-400">Belum ada kegiatan</p>
                        <p className="mt-1 text-xs text-gray-600">
                            Kegiatan yang kamu submit akan muncul di sini.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-600">
                            {filteredActivities.length} kegiatan · halaman {safePage} dari {totalPages}
                        </p>

                        <div className="space-y-2.5">
                            {visible.map((activity, index) => {
                                const mode = normalizeMode(activity)
                                const isEvent = mode === 'event'
                                const isSport = mode === 'sport'
                                const status = getReviewLabel(activity.review_status)
                                const sourceLabel = getSourceLabel(activity.source)
                                const distance = toSafeNumber(activity.distance)

                                return (
                                    <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.06]"
                                    >
                                        <div
                                            className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                                                isEvent
                                                    ? 'bg-yellow-500/15'
                                                    : isSport
                                                        ? 'bg-orange-500/15'
                                                        : 'bg-[#FC4C02]/10'
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

                                        <div className="min-w-0 flex-grow">
                                            <p
                                                className={`truncate text-sm font-bold leading-tight ${
                                                    isEvent ? 'text-yellow-400' : 'text-white'
                                                }`}
                                            >
                                                {activity.name}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {new Date(activity.start_date).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                        isEvent
                                                            ? 'bg-yellow-500/10 text-yellow-400'
                                                            : isSport
                                                                ? 'bg-orange-500/10 text-orange-300'
                                                                : 'bg-white/[0.06] text-gray-400'
                                                    }`}
                                                >
                                                    {isEvent ? 'Event' : isSport ? 'Sport' : 'Daily'}
                                                </span>
                                                {isSport && (
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                            activity.source === 'strava'
                                                                ? 'bg-[#FC4C02]/10 text-[#FC4C02]'
                                                                : 'bg-white/[0.06] text-gray-400'
                                                        }`}
                                                    >
                                                        {sourceLabel}
                                                    </span>
                                                )}
                                                {isSport && (
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                            status === 'voided' || status === 'rejected'
                                                                ? 'bg-red-500/10 text-red-400'
                                                                : 'bg-emerald-500/10 text-emerald-400'
                                                        }`}
                                                    >
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
                                                            className="inline-flex items-center gap-1 text-orange-400 transition-colors hover:text-orange-300"
                                                        >
                                                            <Camera size={11} />
                                                            Proof
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0 pt-0.5 text-right">
                                            <p
                                                className={`font-mono text-base font-black ${
                                                    isEvent
                                                        ? 'text-yellow-400'
                                                        : isSport
                                                            ? 'text-orange-300'
                                                            : 'text-[#FC4C02]'
                                                }`}
                                            >
                                                {isEvent
                                                    ? toSafeNumber(activity.steps).toLocaleString()
                                                    : isSport
                                                        ? toSafeNumber(
                                                              activity.activity_points ?? activity.calories,
                                                          ).toLocaleString()
                                                        : toSafeNumber(activity.steps).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-600">
                                                {isEvent ? 'pts' : isSport ? 'sport pts' : 'steps'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={safePage === 1}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-gray-300 transition-all hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <ChevronLeft size={14} />
                                    Sebelumnya
                                </button>
                                <span className="text-xs text-gray-500">
                                    {safePage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={safePage === totalPages}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-gray-300 transition-all hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    Selanjutnya
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
