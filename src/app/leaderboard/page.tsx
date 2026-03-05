'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'

import Loader from '@/components/ui/Loader'

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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Leaderboard() {
    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [selectedDimension, setSelectedDimension] = useState<string>('overall')
    const [activeTab, setActiveTab] = useState<'overall' | 'steps' | 'quests'>('overall')

    const leaderboardUrl = selectedDimension === 'overall'
        ? '/api/leaderboard'
        : `/api/leaderboard?dimension=${selectedDimension}`

    const { data, isLoading: loading } = useSWR(leaderboardUrl, fetcher, {
        revalidateOnFocus: true,
        refreshInterval: 30000,
    })

    const leaders: LeaderboardEntry[] = data?.leaderboard || []

    useEffect(() => {
        fetch('/api/dimensions').then(r => r.json()).then(d => setDimensions(d.dimensions || []))
    }, [])

    // Sort Logic
    const sortedLeaders = [...leaders].sort((a, b) => {
        if (selectedDimension !== 'overall') {
            return (b.dimension_points?.[selectedDimension] ?? 0) - (a.dimension_points?.[selectedDimension] ?? 0)
        }
        if (activeTab === 'steps') return b.total_steps - a.total_steps
        if (activeTab === 'quests') return b.quest_points - a.quest_points
        return b.overall_points - a.overall_points
    })

    const getDisplayPoints = (entry: LeaderboardEntry) => {
        if (selectedDimension !== 'overall') {
            return entry.dimension_points?.[selectedDimension] ?? 0
        }
        if (activeTab === 'overall') return entry.overall_points
        if (activeTab === 'steps') return entry.total_steps
        return entry.quest_points
    }

    if (loading) {
        return <Loader text="LOADING LEADERBOARD..." />
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[80px] opacity-15" />
                <div className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-15" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-8 p-4 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#FC4C02] to-orange-500 bg-clip-text text-transparent">
                        Leaderboard
                    </h1>
                    <p className="text-sm md:text-base text-gray-400">
                        Top performers across all categories
                    </p>
                </header>

                {/* Dimension Filter Tabs */}
                {dimensions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
                        <button
                            onClick={() => setSelectedDimension('overall')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                selectedDimension === 'overall' ? 'bg-[#FC4C02] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            Overall
                        </button>
                        {dimensions.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDimension(d.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                    selectedDimension === d.id ? 'bg-[#FC4C02] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                {d.display_name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sort Tabs (only show when viewing overall dimension) */}
                {selectedDimension === 'overall' && (
                    <div className="flex justify-center gap-2 mb-8 bg-white/5 p-1 rounded-full w-max mx-auto backdrop-blur-md border border-white/5">
                        <button
                            onClick={() => setActiveTab('overall')}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'overall' ? 'bg-[#FC4C02] text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Overall
                        </button>
                        <button
                            onClick={() => setActiveTab('steps')}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'steps' ? 'bg-[#FC4C02] text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Steps
                        </button>
                        <button
                            onClick={() => setActiveTab('quests')}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'quests' ? 'bg-[#FC4C02] text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Quests
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    {sortedLeaders.map((entry, index) => (
                        <div
                            key={entry.user_id}
                            className={`relative flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md transition-all ${index === 0
                                ? 'bg-gradient-to-r from-[#FC4C02]/10 to-transparent border-[#FC4C02]/50 shadow-[0_0_20px_rgba(252,76,2,0.15)] scale-[1.02]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold text-sm rounded-full ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                index === 1 ? 'bg-gray-300/20 text-gray-300' :
                                    index === 2 ? 'bg-orange-700/20 text-orange-700' :
                                        'bg-gray-800 text-gray-500'
                                }`}>
                                {index === 0 ? '\u{1F451}' : index + 1}
                            </div>

                            <img
                                src={entry.avatar_url || 'https://via.placeholder.com/150'}
                                alt={entry.full_name}
                                className="w-12 h-12 rounded-full border border-white/10 object-cover"
                            />

                            <div className="flex-grow min-w-0">
                                <h3 className="text-base font-bold text-white truncate pr-2">
                                    {entry.full_name}
                                </h3>
                                <p className="text-xs text-gray-500 tracking-wider">
                                    {entry.instagram_username ? (
                                        <span className="text-[#FC4C02]">@{entry.instagram_username}</span>
                                    ) : (
                                        <span className="uppercase">
                                            {selectedDimension !== 'overall'
                                                ? dimensions.find(d => d.id === selectedDimension)?.display_name ?? 'Dimension'
                                                : activeTab === 'overall' ? 'Total Points'
                                                : activeTab === 'steps' ? 'Total Steps'
                                                : 'Quest Points'}
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <span className={`text-xl font-mono font-bold block ${index === 0 ? 'text-[#FC4C02]' : 'text-white'}`}>
                                    {getDisplayPoints(entry).toLocaleString()}
                                    <span className="text-xs font-sans ml-0.5 opacity-60">
                                        {selectedDimension === 'overall' && activeTab === 'steps' ? '' : ' pts'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
