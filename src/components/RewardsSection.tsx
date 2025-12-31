'use client'

import { useState } from 'react'
import { Gift, Lock, Footprints, Flame, Check, Loader2, User } from 'lucide-react'
import { useRewards } from '@/hooks/use-swr-hooks'
import { useToast } from '@/context/ToastContext'
import Loader from '@/components/ui/Loader'

export default function RewardsSection() {
    const { rewards, userStats, isLoading, mutate } = useRewards()
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
    const { success, error } = useToast()

    // Auto-fetch handled by SWR

    const handleClaim = async (rewardId: string) => {
        setClaimingId(rewardId)
        try {
            const res = await fetch('/api/rewards/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId })
            })

            if (res.ok) {
                setClaimSuccess(rewardId)
                mutate() // Refresh to update status
                setTimeout(() => setClaimSuccess(null), 3000)
                success('Reward claimed!')
            } else {
                const err = await res.json()
                error(err.error || 'Failed to claim')
            }
        } catch (e) {
            error('Something went wrong')
        } finally {
            setClaimingId(null)
        }
    }

    if (isLoading) {
        return <Loader text="LOADING REWARDS..." />
    }

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="text-[#FC4C02]" /> Rewards
                </h2>
                <div className="flex gap-4 text-xs font-mono font-bold">
                    <div className="flex items-center gap-1 text-yellow-500">
                        <Flame size={14} /> {userStats.totalPoints} PTS
                    </div>
                    <div className="flex items-center gap-1 text-blue-500">
                        <Footprints size={14} /> {userStats.totalSteps} STEPS
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rewards.map((reward: any) => (
                    <div
                        key={reward.id}
                        className={`relative bg-[#1a1a1a] border rounded-2xl overflow-hidden flex flex-col justify-between group
                            ${reward.status === 'LOCKED' ? 'border-white/5 opacity-80'
                                : reward.status === 'CLAIMED' ? 'border-green-500/50'
                                    : reward.status === 'SOLD_OUT' ? 'border-red-500/50 grayscale'
                                        : 'border-white/10 hover:border-[#FC4C02] transition-colors'}
                        `}
                    >
                        {/* Image / Icon Area */}
                        <div className="h-32 bg-black/50 flex items-center justify-center relative overflow-hidden">
                            {reward.status === 'LOCKED' ? (
                                <Lock size={32} className="text-gray-600" />
                            ) : reward.image_url ? (
                                <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover" />
                            ) : (
                                <Gift size={32} className={reward.status === 'CLAIMED' ? 'text-green-500' : 'text-[#FC4C02]'} />
                            )}

                            {reward.status === 'SOLD_OUT' && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <span className="text-red-500 font-bold uppercase tracking-widest text-sm -rotate-12 border-2 border-red-500 px-2 py-1">Sold Out</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className={`font-bold text-sm mb-1 ${reward.status === 'LOCKED' ? 'text-gray-400 font-mono tracking-widest' : ''}`}>
                                {reward.title}
                            </h3>
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                                {reward.description}
                            </p>

                            {/* Claimers Avatars */}
                            {reward.claimers && reward.claimers.length > 0 && (
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex -space-x-2">
                                        {reward.claimers.map((avatar: string, idx: number) => (
                                            avatar === 'default' ? (
                                                <div key={idx} className="w-5 h-5 rounded-full border border-[#1a1a1a] bg-gray-800 flex items-center justify-center text-gray-400">
                                                    <User size={12} />
                                                </div>
                                            ) : (
                                                <img
                                                    key={idx}
                                                    src={avatar}
                                                    className="w-5 h-5 rounded-full border border-[#1a1a1a] bg-gray-800 object-cover"
                                                    alt="Claimer"
                                                />
                                            )
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-500">Claimed</span>
                                </div>
                            )}

                            <div className="mt-auto">
                                {/* Requirements */}
                                {(reward.status === 'LOCKED' || reward.status === 'AVAILABLE' || reward.status === 'LOCKED_BUT_REVEALED') && (
                                    <div className="flex gap-2 mb-3 text-[10px] font-bold uppercase">
                                        {reward.required_points > 0 && (
                                            <span className={`${userStats.totalPoints >= reward.required_points ? 'text-yellow-500' : 'text-gray-600'}`}>
                                                {reward.required_points} PTS
                                            </span>
                                        )}
                                        {reward.required_steps > 0 && (
                                            <span className={`${userStats.totalSteps >= reward.required_steps ? 'text-blue-500' : 'text-gray-600'}`}>
                                                {reward.required_steps} STEPS
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Action Button */}
                                {reward.status === 'CLAIMED' ? (
                                    <div className="w-full bg-green-500/20 text-green-500 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1">
                                        <Check size={12} /> Claimed
                                    </div>
                                ) : (reward.status === 'LOCKED' || reward.status === 'LOCKED_BUT_REVEALED') ? (
                                    <div className="w-full bg-white/5 text-gray-500 py-2 rounded-lg text-xs font-bold text-center uppercase flex items-center justify-center gap-1">
                                        <Lock size={12} /> Locked
                                    </div>
                                ) : reward.status === 'SOLD_OUT' ? (
                                    <div className="w-full bg-white/5 text-gray-600 py-2 rounded-lg text-xs font-bold text-center uppercase">
                                        Out of Stock
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleClaim(reward.id)}
                                        disabled={claimingId === reward.id || claimSuccess === reward.id}
                                        className="w-full bg-[#FC4C02] hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold transition-colors uppercase flex items-center justify-center gap-2"
                                    >
                                        {claimingId === reward.id ? <Loader2 size={12} className="animate-spin" />
                                            : claimSuccess === reward.id ? <Check size={12} />
                                                : 'Claim'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {rewards.length === 0 && (
                    <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-8 text-center text-gray-500 text-sm">
                        No rewards available yet. Check back soon!
                    </div>
                )}
            </div>
        </section>
    )
}
