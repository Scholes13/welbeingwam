'use client'

import { useMemo } from 'react'
import { useLeaderboard } from '@/hooks/use-swr-hooks'
import { useSettings } from '@/context/SettingsContext'
import LeaderboardList from '@/components/leaderboard/LeaderboardList'
import Loader from '@/components/ui/Loader'
import { Trophy, TrendingUp } from 'lucide-react'

// Helper function to get cookie value
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
}

export default function Leaderboard() {
    const { leaderboard, currentParticipant, isLoading } = useLeaderboard()
    const { settings } = useSettings()
    
    // Get current participant ID from cookie using useMemo to avoid re-renders
    const currentParticipantId = useMemo(() => getCookie('participant_id'), [])

    // Check if leaderboard feature is disabled
    if (settings && !settings.features.leaderboard) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h2 className="text-2xl font-bold mb-2">Leaderboard Disabled</h2>
                    <p className="text-gray-400">
                        The leaderboard feature is currently disabled.
                    </p>
                </div>
            </div>
        )
    }

    if (isLoading) {
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
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Trophy className="w-8 h-8 text-[#FC4C02]" />
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FC4C02] to-orange-500 bg-clip-text text-transparent">
                            Leaderboard
                        </h1>
                    </div>
                    <p className="text-sm md:text-base text-gray-400">
                        Top explorers competing in real-time
                    </p>
                    {currentParticipant && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                            <TrendingUp className="w-4 h-4 text-[#FC4C02]" />
                            <span className="text-sm">
                                Your Rank: <span className="font-bold text-[#FC4C02]">#{currentParticipant.rank}</span>
                            </span>
                        </div>
                    )}
                </header>

                <LeaderboardList 
                    entries={leaderboard} 
                    currentParticipantId={currentParticipantId}
                />

                {leaderboard.length === 0 && (
                    <div className="text-center py-12">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">No participants yet. Be the first to check in!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
