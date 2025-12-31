'use client'

import { useState, useEffect } from 'react'
import { Check, Gift, Loader2, Timer } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function DailyQuests({ quests = [], userQuests = [], onClaim }: any) {
    const [loadingIds, setLoadingIds] = useState<string[]>([])

    const { success, error } = useToast()

    const getCountdown = (expiresAt: string) => {
        const total = Date.parse(expiresAt) - Date.parse(new Date().toString())
        const seconds = Math.floor((total / 1000) % 60)
        const minutes = Math.floor((total / 1000 / 60) % 60)
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
        const days = Math.floor(total / (1000 * 60 * 60 * 24))

        if (total <= 0) return 'Expired'

        if (days > 0) return `${days}d ${hours}h left`
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    // Force re-render every second for countdown
    const [tick, setTick] = useState(0)
    useEffect(() => {
        // Only run timer if there are quests with deadlines
        const hasDeadline = quests.some((q: any) => q.expires_at)
        if (!hasDeadline) return

        const timer = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(timer)
    }, [quests])

    const handleClaim = async (questId: string) => {
        setLoadingIds(prev => [...prev, questId])
        try {
            const res = await fetch('/api/quests/claim', {
                method: 'POST',
                body: JSON.stringify({ questId })
            })
            if (res.ok) {
                success('Quest Claimed! Points added.')
                onClaim() // Refresh parent data
            } else {
                throw new Error('Failed to claim')
            }
        } catch (e) {
            console.error(e)
            error('Failed to claim quest')
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== questId))
        }
    }

    // Filter out completed quests
    const uncompletedQuests = quests.filter((q: any) =>
        !userQuests.some((uq: any) => uq.quest_id === q.id)
    )

    // If no uncompleted quests, hide the entire section (as requested)
    if (uncompletedQuests.length === 0) return null

    // Show max 3 on dashboard
    const visibleQuests = uncompletedQuests.slice(0, 3)

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="text-[#FC4C02]" /> Daily Quests
                </h2>
                <button
                    onClick={() => window.location.href = '/quests'}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {visibleQuests.map((quest: any) => {
                    const isClaiming = loadingIds.includes(quest.id)
                    const timeLeft = quest.expires_at ? getCountdown(quest.expires_at) : null
                    const isExpired = timeLeft === 'Expired'

                    if (isExpired) return null // Hide expired quests

                    return (
                        <div key={quest.id} className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                    {quest.title}
                                    <span className="bg-[#FC4C02]/20 text-[#FC4C02] text-[10px] px-2 py-0.5 rounded-full">
                                        +{quest.points}
                                    </span>
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-1 mb-1">{quest.description}</p>
                                {timeLeft && (
                                    <div className="text-xs font-mono font-bold text-yellow-500 flex items-center gap-1.5 mt-1">
                                        <Timer className="w-3.5 h-3.5" />
                                        {timeLeft}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleClaim(quest.id)}
                                disabled={isClaiming}
                                className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 min-w-[80px] flex justify-center"
                            >
                                {isClaiming ? <Loader2 size={16} className="animate-spin" /> : 'Done'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
