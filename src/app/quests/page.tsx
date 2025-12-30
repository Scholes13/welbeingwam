'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Target, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function QuestsPage() {
    const [quests, setQuests] = useState<any[]>([])
    const [userQuests, setUserQuests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch Active Quests
            const { data: questsData } = await supabase
                .from('quests')
                .select('*')
                .eq('is_active', true)
                .order('points', { ascending: true })

            // Fetch User Progress
            const { data: { user } } = await supabase.auth.getUser()
            // Note: Since we use custom auth (cookies), we might need to fetch user ID differently if not using supabase auth context.
            // But previous components used pure fetch to API to get context.
            // To be consistent and safe with "manual" auth which relies on cookies, we should probably use the API endpoint '/api/strava/sync' or similar to get data, 
            // OR use client-side supabase if we are sure the session is there. 
            // However, the `DailyQuests` component used props passed from Dashboard.
            // Here we are a standalone page.
            // Let's use the same pattern as `RewardsPage` (which used `RewardsSection` that fetches from `/api/rewards/list`).
            // I should create an API for `/api/quests/list` OR just reuse `/api/strava/sync`?
            // `/api/strava/sync` returns everything. Let's use that for simplicity and consistency with Auth.

            const res = await fetch('/api/strava/sync')
            const data = await res.json()

            if (data.quests) setQuests(data.quests)
            if (data.userQuests) setUserQuests(data.userQuests)

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleClaim = async (questId: string) => {
        // Optimistic UI update
        const originalUserQuests = [...userQuests]
        // Mock a completed entry
        const mockEntry = { quest_id: questId, status: 'approved' } // Simplified
        setUserQuests([...userQuests, mockEntry])

        try {
            const res = await fetch('/api/quests/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId })
            })

            if (!res.ok) throw new Error('Failed to claim')

            // Refresh real data
            fetchData()
        } catch (e) {
            // Revert
            setUserQuests(originalUserQuests)
            alert('Failed to claim quest')
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-yellow-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-8 p-4">
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

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading quests...</div>
                ) : (
                    <div className="space-y-4">
                        {quests.map((quest) => {
                            const isCompleted = userQuests.some((uq: any) => uq.quest_id === quest.id)

                            return (
                                <motion.div
                                    key={quest.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`relative p-6 rounded-2xl border flex items-center justify-between gap-4 transition-all
                                        ${isCompleted
                                            ? 'bg-green-500/10 border-green-500/20 opacity-70'
                                            : 'bg-[#1a1a1a] border-white/10 hover:border-yellow-500/50'
                                        }
                                    `}
                                >
                                    <div className="flex-1">
                                        <h3 className={`font-bold mb-1 ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                                            {quest.title}
                                        </h3>
                                        <p className="text-xs text-gray-400 line-clamp-2">
                                            {quest.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-lg font-mono text-xs font-bold">
                                            +{quest.points} PTS
                                        </span>

                                        {isCompleted ? (
                                            <div className="flex items-center gap-1 text-green-500 text-xs font-bold px-3 py-1.5 bg-green-500/10 rounded-full">
                                                <Check size={14} /> Done
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleClaim(quest.id)}
                                                className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 transition-colors"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}

                        {quests.length === 0 && (
                            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                No active quests today.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
