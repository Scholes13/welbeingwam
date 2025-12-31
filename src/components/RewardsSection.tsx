'use client'

import { useState } from 'react'
import { Gift, Lock, Footprints, Coins, Check, Loader2, User, Shuffle, X, ArrowRight } from 'lucide-react'
import { useRewards, useProfile } from '@/hooks/use-swr-hooks'
import { useToast } from '@/context/ToastContext'
import Loader from '@/components/ui/Loader'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

export default function RewardsSection() {
    const { rewards, rerollPrice, userStats, isLoading, mutate } = useRewards()
    const { profile, mutate: mutateProfile } = useProfile()
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [isRerolling, setIsRerolling] = useState(false) // Loading state
    const [showPreview, setShowPreview] = useState(false) // Modal state
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
    const { success, error } = useToast()

    // Auto-fetch handled by SWR

    const handleReroll = async () => {
        setIsRerolling(true)
        setShowPreview(true) // Open modal immediately to show animation
        setPreviewAvatar(null) // Reset

        try {
            // Add superficial delay for animation effect (1.5s)
            const [res] = await Promise.all([
                fetch('/api/rewards/reroll', { method: 'POST' }),
                new Promise(resolve => setTimeout(resolve, 2000))
            ])

            const data = await res.json()

            if (res.ok) {
                setPreviewAvatar(data.newAvatarUrl)
                mutate() // Refresh coins immediately (since they are deducted)
                // Do NOT mutate profile yet
            } else {
                setShowPreview(false)
                error(data.error || 'Failed to reroll')
            }
        } catch (e) {
            setShowPreview(false)
            error('Something went wrong')
        } finally {
            setIsRerolling(false)
        }
    }

    const handleEquip = async () => {
        if (!previewAvatar) return
        try {
            const res = await fetch('/api/user/update-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatarUrl: previewAvatar })
            })
            if (res.ok) {
                mutateProfile() // Update global profile
                setShowPreview(false)
                success('New avatar equipped!')
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FC4C02', '#ffffff']
                })
            } else {
                error('Failed to equip')
            }
        } catch (e) {
            error('Connection error')
        }
    }

    const closeModal = () => {
        setShowPreview(false)
        setPreviewAvatar(null)
    }

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
        <section className="mb-8 relative">
            {/* Reroll Modal */}
            <AnimatePresence>
                {showPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={!isRerolling ? closeModal : undefined}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-[#FC4C02] rounded-3xl p-6 w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(252,76,2,0.3)]"
                        >
                            {!isRerolling && (
                                <button
                                    onClick={closeModal}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                >
                                    <X size={24} />
                                </button>
                            )}

                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2">
                                    <Shuffle className="text-[#FC4C02]" />
                                    {isRerolling ? 'ROLLING...' : 'AVATAR RESULT'}
                                </h3>

                                <div className="flex items-center justify-center gap-4 mb-8">
                                    {/* Old Avatar */}
                                    <div className={`transition-opacity duration-500 ${isRerolling ? 'opacity-50 grayscale scale-90' : 'opacity-50 grayscale scale-75'}`}>
                                        <div className="w-20 h-20 rounded-full bg-black border-2 border-white/10 overflow-hidden mx-auto mb-2">
                                            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} alt="Old" className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">CURRENT</p>
                                    </div>

                                    {/* New Avatar / Loading */}
                                    <div className="relative">
                                        <div className={`w-32 h-32 rounded-full bg-gradient-to-b from-[#FC4C02] to-black p-[2px] shadow-[0_0_30px_rgba(252,76,2,0.5)] ${isRerolling ? 'animate-pulse' : ''}`}>
                                            <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                                                {isRerolling ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                        >
                                                            <Shuffle size={32} className="text-[#FC4C02]" />
                                                        </motion.div>
                                                    </div>
                                                ) : (
                                                    <motion.img
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "tween" }}
                                                        src={previewAvatar || ''}
                                                        alt="New"
                                                        className="w-full h-full object-cover bg-white"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold mt-2 text-[#FC4C02]">NEW LOOK</p>
                                    </div>
                                </div>

                                {!isRerolling && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={closeModal}
                                            className="py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-colors text-gray-400"
                                        >
                                            Keep Old
                                        </button>
                                        <button
                                            onClick={handleEquip}
                                            className="py-3 rounded-xl font-bold bg-[#FC4C02] hover:bg-[#e04402] text-white transition-colors shadow-lg shadow-[#FC4C02]/20 flex items-center justify-center gap-2"
                                        >
                                            Equip New <Check size={18} />
                                        </button>
                                    </div>
                                )}

                                {isRerolling && (
                                    <p className="text-sm text-gray-500 animate-pulse">Designing your new look...</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="text-[#FC4C02]" /> Rewards
                </h2>
                <div className="flex gap-4 text-xs font-mono font-bold">
                    <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" className="fill-yellow-500" />
                            <path d="M12 6V18M12 6C14 6 15 7 15 9C15 11 13.5 12 12 12M12 6C10.5 6 9 7 9 9C9 10 9.5 11 11 11.5M12 18C10.5 18 9 17 9 15C9 13 10.5 12 12 12M12 18C13.5 18 15 17 15 15C15 14 14.5 13 13 12.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{userStats.availableCoins ?? userStats.totalPoints} COINS</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Reroll Card */}
                <div className="relative bg-[#1a1a1a] border border-[#FC4C02] rounded-2xl overflow-hidden flex flex-col justify-between group shadow-[0_0_15px_rgba(252,76,2,0.15)]">
                    <div className="h-32 bg-[#FC4C02]/10 flex items-center justify-center relative overflow-hidden">
                        <Shuffle size={32} className="text-[#FC4C02]" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-sm mb-1 text-white">Avatar Reroll</h3>
                        <p className="text-xs text-gray-500 mb-3">Randomize your avatar look!</p>

                        <div className="mt-auto">
                            <div className="flex gap-2 mb-3 text-[10px] font-bold uppercase">
                                <span className={`${(userStats.availableCoins ?? userStats.totalPoints) >= rerollPrice ? 'text-yellow-500' : 'text-gray-600'}`}>
                                    {rerollPrice} COINS
                                </span>
                            </div>
                            <button
                                onClick={handleReroll}
                                disabled={isRerolling || (userStats.availableCoins ?? 0) < rerollPrice}
                                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-[#FC4C02] text-white hover:bg-[#e04402] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRerolling ? <Loader2 className="animate-spin w-3 h-3" /> : <Shuffle className="w-3 h-3" />}
                                {isRerolling ? 'ROLLING...' : 'REROLL'}
                            </button>
                        </div>
                    </div>
                </div>
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
                                            <span className={`${(userStats.availableCoins ?? userStats.totalPoints) >= reward.required_points ? 'text-yellow-500' : 'text-gray-600'}`}>
                                                {reward.required_points} COINS
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
