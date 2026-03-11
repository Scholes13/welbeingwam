'use client'

import { useEffect, useRef, useState } from 'react'
import { Target, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useQuests } from '@/hooks/use-swr-hooks'
import DailyQuests from '@/components/DailyQuests'

interface Dimension {
    id: string
    name: string
    display_name: string
}

export default function QuestsPage() {
    const { quests, userQuests, isLoading, mutate } = useQuests()

    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [selectedDimension, setSelectedDimension] = useState<string>('all')
    const [dimOpen, setDimOpen] = useState(false)
    const dimRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch('/api/dimensions')
            .then(r => r.json())
            .then(d => setDimensions(d.dimensions || []))
            .catch(() => {})
    }, [])

    // Close dropdown on outside click
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (dimRef.current && !dimRef.current.contains(e.target as Node)) {
                setDimOpen(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const baseFiltered = selectedDimension === 'all'
        ? quests
        : quests.filter((q: any) => q.dimension_id === selectedDimension)

    // Sort: belum selesai dulu → dalam grup: expires_at (daily) di atas → created_at terbaru
    const filteredQuests = [...baseFiltered].sort((a: any, b: any) => {
        const aCompleted = userQuests.some((uq: any) => uq.quest_id === a.id)
        const bCompleted = userQuests.some((uq: any) => uq.quest_id === b.id)
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
        const aHasExpiry = a.expires_at ? 0 : 1
        const bHasExpiry = b.expires_at ? 0 : 1
        if (aHasExpiry !== bHasExpiry) return aHasExpiry - bHasExpiry
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

    const completedCount = filteredQuests.filter((q: any) =>
        userQuests.some((uq: any) => uq.quest_id === q.id)
    ).length
    const totalCount = filteredQuests.length
    const questPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const activeDimLabel = selectedDimension === 'all'
        ? 'All Dimensions'
        : dimensions.find(d => d.id === selectedDimension)?.display_name ?? '...'

    return (
        <div className="min-h-screen bg-black text-white pb-32">
            {/* Ambient */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#FC4C02] rounded-full mix-blend-screen blur-[90px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between pt-6 pb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Target size={18} className="text-[#FC4C02]" />
                            <h1 className="text-2xl font-extrabold text-white">Quests</h1>
                        </div>
                        <p className="text-xs text-gray-500">Complete quests to earn points</p>
                    </div>

                    {/* Dimension Dropdown — sama persis seperti leaderboard */}
                    <div className="relative" ref={dimRef}>
                        <button
                            onClick={() => setDimOpen(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all"
                        >
                            <SlidersHorizontal size={13} className="text-[#FC4C02]" />
                            <span className="max-w-[90px] truncate">{activeDimLabel}</span>
                            <ChevronDown size={12} className={`transition-transform ${dimOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dimOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                <button
                                    onClick={() => { setSelectedDimension('all'); setDimOpen(false) }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDimension === 'all' ? 'text-[#FC4C02] bg-[#FC4C02]/10' : 'text-gray-300 hover:bg-white/5'}`}
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

                {/* ── Overall progress bar ── */}
                {totalCount > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 flex items-center gap-3 mb-5">
                        <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-gray-400">Overall Progress</span>
                                <span className="text-xs font-mono font-bold text-white">
                                    {completedCount}/{totalCount}
                                </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#FC4C02] to-orange-400 rounded-full transition-all duration-700"
                                    style={{ width: `${questPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FC4C02]/10 border border-[#FC4C02]/30 flex items-center justify-center">
                            <span className="text-xs font-extrabold text-[#FC4C02]">{questPercent}%</span>
                        </div>
                    </div>
                )}

                {/* ── Quest List ── */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-600">
                        <div className="w-4 h-4 border-2 border-[#FC4C02]/50 border-t-[#FC4C02] rounded-full animate-spin" />
                        <span className="text-sm">Loading quests...</span>
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <div className="text-center py-16 text-gray-600">
                        <Target size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No quests available</p>
                    </div>
                ) : (
                    <DailyQuests
                        quests={filteredQuests}
                        userQuests={userQuests}
                        onClaim={() => mutate()}
                        showAll={true}
                        includeCompleted={true}
                        hideHeader={true}
                    />
                )}
            </div>
        </div>
    )
}
