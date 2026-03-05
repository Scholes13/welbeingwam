'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Target } from 'lucide-react'
import { useQuests } from '@/hooks/use-swr-hooks'
import DailyQuests from '@/components/DailyQuests'

interface Dimension {
    id: string
    name: string
    display_name: string
}

export default function QuestsPage() {
    const { quests, userQuests, isLoading, mutate } = useQuests()
    const router = useRouter()

    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [selectedDimension, setSelectedDimension] = useState<string>('all')

    useEffect(() => {
        fetch('/api/dimensions')
            .then(r => r.json())
            .then(d => setDimensions(d.dimensions || []))
            .catch(() => {})
    }, [])

    // Filter quests by selected dimension
    const filteredQuests = selectedDimension === 'all'
        ? quests
        : quests.filter((q: any) => q.dimension_id === selectedDimension)

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-yellow-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-6 p-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Target className="text-yellow-500" /> Daily Quests
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Complete quests to earn points and unlock rewards!
                    </p>
                </header>

                {/* Dimension Filter Tabs */}
                {dimensions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide px-4 mb-2">
                        <button
                            onClick={() => setSelectedDimension('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                selectedDimension === 'all' ? 'bg-[#FC4C02] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            All
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

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading quests...</div>
                ) : (
                    <DailyQuests
                        quests={filteredQuests}
                        userQuests={userQuests}
                        onClaim={() => mutate()}
                        showAll={true}
                        includeCompleted={true}
                    />
                )}
            </div>
        </div>
    )
}
