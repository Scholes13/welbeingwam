'use client'

import { useState } from 'react'
import { Check, Gift, Loader2 } from 'lucide-react'

export default function DailyQuests({ quests = [], userQuests = [], onClaim }: any) {
    const [loadingIds, setLoadingIds] = useState<string[]>([])

    const handleClaim = async (questId: string) => {
        setLoadingIds(prev => [...prev, questId])
        try {
            const res = await fetch('/api/quests/claim', {
                method: 'POST',
                body: JSON.stringify({ questId })
            })
            if (res.ok) {
                onClaim() // Refresh parent data
            }
        } catch (e) {
            console.error(e)
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

                    return (
                        <div key={quest.id} className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                    {quest.title}
                                    <span className="bg-[#FC4C02]/20 text-[#FC4C02] text-[10px] px-2 py-0.5 rounded-full">
                                        +{quest.points}
                                    </span>
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-1">{quest.description}</p>
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
