'use client'

import { useState } from 'react'
import { Gift, Lock, Footprints, Coins, Check, Loader2, User, Shuffle, X, ArrowRight, MapPin, HelpCircle } from 'lucide-react'
import { useRewards, useProfile } from '@/hooks/use-swr-hooks'
import { useToast } from '@/context/ToastContext'
import Loader from '@/components/ui/Loader'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useFullscreenOverlay } from '@/context/OverlayContext'

export default function RewardsSection() {
    const { rewards, rerollPrice, userStats, isLoading, mutate } = useRewards()
    const { profile, mutate: mutateProfile } = useProfile()
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [isRerolling, setIsRerolling] = useState(false) // Loading state
    const [showPreview, setShowPreview] = useState(false) // Modal state
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

    // Background Gacha states
    const [isBgGacha, setIsBgGacha] = useState(false)
    const [showBgPreview, setShowBgPreview] = useState(false)
    const [previewBackground, setPreviewBackground] = useState<any>(null)
    const BACKGROUND_GACHA_PRICE = 300 // Can be fetched from API later

    // Clue Reveal states
    const [isClueLoading, setIsClueLoading] = useState(false)
    const [showClueModal, setShowClueModal] = useState(false)
    const [spotClues, setSpotClues] = useState<Array<{ name: string; clue: string }>>([])
    const CLUE_REVEAL_PRICE = 200

    const { success, error } = useToast()

    // Hide BottomNav while any fullscreen reward modal is open.
    useFullscreenOverlay(showPreview || showBgPreview || showClueModal)

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

    // Background Gacha handlers
    const handleBgGacha = async () => {
        setIsBgGacha(true)
        setShowBgPreview(true)
        setPreviewBackground(null)

        try {
            const [res] = await Promise.all([
                fetch('/api/rewards/background-gacha', { method: 'POST' }),
                new Promise(resolve => setTimeout(resolve, 2000))
            ])

            const data = await res.json()

            if (res.ok) {
                setPreviewBackground(data.background)
                mutate()
            } else {
                setShowBgPreview(false)
                error(data.error || 'Failed to gacha')
            }
        } catch (e) {
            setShowBgPreview(false)
            error('Something went wrong')
        } finally {
            setIsBgGacha(false)
        }
    }

    const handleEquipBackground = async () => {
        if (!previewBackground) return
        try {
            const res = await fetch('/api/user/update-background', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backgroundId: previewBackground.id })
            })
            if (res.ok) {
                mutateProfile()
                setShowBgPreview(false)
                success('New background equipped!')
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FC4C02', '#ffd700', '#ffffff']
                })
            } else {
                error('Failed to equip')
            }
        } catch (e) {
            error('Connection error')
        }
    }

    const closeBgModal = () => {
        setShowBgPreview(false)
        setPreviewBackground(null)
    }

    // Clue Reveal handlers
    const handleRevealClues = async () => {
        setIsClueLoading(true)
        setShowClueModal(true)
        setSpotClues([])

        try {
            // Deduct coins first via API
            const purchaseRes = await fetch('/api/rewards/reveal-clues', { method: 'POST' })

            const [cluesRes] = await Promise.all([
                fetch('/api/spots/clues'),
                new Promise(resolve => setTimeout(resolve, 1500)) // Animation delay
            ])

            const purchaseData = await purchaseRes.json()
            const cluesData = await cluesRes.json()

            if (purchaseRes.ok && cluesData.clues) {
                setSpotClues(cluesData.clues)
                mutate() // Refresh coins
                confetti({
                    particleCount: 60,
                    spread: 50,
                    origin: { y: 0.6 },
                    colors: ['#ffd700', '#ffcc00', '#FC4C02']
                })
            } else {
                setShowClueModal(false)
                error(purchaseData.error || 'Failed to reveal clues')
            }
        } catch (e) {
            setShowClueModal(false)
            error('Something went wrong')
        } finally {
            setIsClueLoading(false)
        }
    }

    const closeClueModal = () => {
        setShowClueModal(false)
        setSpotClues([])
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
                    <motion.div
                        key="reroll-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
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
                                        <div className="w-20 h-20 rounded-full bg-black border-2 border-white/[0.12] overflow-hidden mx-auto mb-2">
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
                                            className="py-3 rounded-xl font-bold border border-white/[0.12] hover:bg-white/5 transition-colors text-gray-400"
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Reroll Modal */}
            <AnimatePresence>
                {showBgPreview && (
                    <motion.div
                        key="bg-reroll-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={!isBgGacha ? closeBgModal : undefined}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-[#FC4C02] rounded-3xl p-6 w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(252,76,2,0.3)]"
                        >
                            {!isBgGacha && (
                                <button
                                    onClick={closeBgModal}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                >
                                    <X size={24} />
                                </button>
                            )}

                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2">
                                    <Shuffle className="text-[#FC4C02]" />
                                    {isBgGacha ? 'ROLLING...' : 'BACKGROUND RESULT'}
                                </h3>

                                <div className="mb-8">
                                    <div className={`w-full h-48 rounded-2xl overflow-hidden border-2 border-[#FC4C02] shadow-[0_0_30px_rgba(252,76,2,0.4)] ${isBgGacha ? 'animate-pulse' : ''}`}>
                                        {isBgGacha ? (
                                            <div className="w-full h-full bg-[#FC4C02]/20 flex items-center justify-center">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                >
                                                    <Shuffle size={32} className="text-[#FC4C02]" />
                                                </motion.div>
                                            </div>
                                        ) : previewBackground?.image ? (
                                            <img
                                                src={previewBackground.image}
                                                alt={previewBackground.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full"
                                                style={{ background: previewBackground?.gradient || 'linear-gradient(180deg, #FC4C02 0%, #ff7043 100%)' }}
                                            />
                                        )}
                                    </div>
                                    {previewBackground && (
                                        <p className="mt-3 text-lg font-bold text-[#FC4C02]">{previewBackground.name}</p>
                                    )}
                                </div>

                                {!isBgGacha && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={closeBgModal}
                                            className="py-3 rounded-xl font-bold border border-white/[0.12] hover:bg-white/5 transition-colors text-gray-400"
                                        >
                                            Keep Old
                                        </button>
                                        <button
                                            onClick={handleEquipBackground}
                                            className="py-3 rounded-xl font-bold bg-[#FC4C02] hover:bg-[#e04402] text-white transition-colors shadow-lg shadow-[#FC4C02]/20 flex items-center justify-center gap-2"
                                        >
                                            Equip New <Check size={18} />
                                        </button>
                                    </div>
                                )}

                                {isBgGacha && (
                                    <p className="text-sm text-gray-500 animate-pulse">Designing your new background...</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clue Reveal Modal */}
            <AnimatePresence>
                {showClueModal && (
                    <motion.div
                        key="clue-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={!isClueLoading ? closeClueModal : undefined}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-[#FC4C02] rounded-3xl p-6 w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(252,76,2,0.3)] max-h-[80vh] overflow-hidden"
                        >
                            {!isClueLoading && (
                                <button
                                    onClick={closeClueModal}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
                                >
                                    <X size={24} />
                                </button>
                            )}

                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                                    <MapPin className="text-[#FC4C02]" />
                                    {isClueLoading ? 'REVEALING...' : 'SPOT CLUES'}
                                </h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    {isClueLoading ? 'Decoding hidden locations...' : 'Hints to find hidden QR spots!'}
                                </p>

                                {isClueLoading ? (
                                    <div className="py-16">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                            className="w-16 h-16 mx-auto border-4 border-[#FC4C02]/20 border-t-[#FC4C02] rounded-full"
                                        />
                                        <p className="mt-4 text-[#FC4C02] animate-pulse">Unlocking secrets...</p>
                                    </div>
                                ) : spotClues.length === 0 ? (
                                    <div className="py-12 text-gray-500">
                                        <MapPin size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>No active spots with clues right now.</p>
                                        <p className="text-sm">Check back later!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                                        {spotClues.map((clue, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.15 }}
                                                className="bg-gradient-to-r from-[#FC4C02]/10 to-orange-500/10 border border-[#FC4C02]/30 rounded-xl p-4 text-left"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MapPin size={14} className="text-[#FC4C02]" />
                                                    <span className="font-bold text-[#FC4C02] text-sm">{clue.name}</span>
                                                </div>
                                                <p className="text-gray-300 text-sm italic">"{clue.clue}"</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {!isClueLoading && spotClues.length > 0 && (
                                    <button
                                        onClick={closeClueModal}
                                        className="mt-6 w-full py-3 rounded-xl font-bold bg-[#FC4C02] hover:bg-orange-600 text-white transition-colors"
                                    >
                                        Got it!
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="text-[#FC4C02]" /> Rewards
                </h2>
                <div className="flex gap-4 text-xs font-mono font-bold">
                    <div className="flex items-center gap-1 text-[#FC4C02] bg-[#FC4C02]/10 px-3 py-1 rounded-full border border-[#FC4C02]/20">
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
                                <span className={`${(userStats.availableCoins ?? userStats.totalPoints) >= rerollPrice ? 'text-[#FC4C02]' : 'text-gray-600'}`}>
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

                {/* Background Reroll Card */}
                <div className="relative bg-[#1a1a1a] border border-[#FC4C02] rounded-2xl overflow-hidden flex flex-col justify-between group shadow-[0_0_15px_rgba(252,76,2,0.15)]">
                    <div className="h-32 bg-[#FC4C02]/10 flex items-center justify-center relative overflow-hidden">
                        <span className="text-3xl">🎴</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-sm mb-1 text-white">ID Card Background</h3>
                        <p className="text-xs text-gray-500 mb-3">Reroll your ID card look!</p>

                        <div className="mt-auto">
                            <div className="flex gap-2 mb-3 text-[10px] font-bold uppercase">
                                <span className={`${(userStats.availableCoins ?? userStats.totalPoints) >= BACKGROUND_GACHA_PRICE ? 'text-[#FC4C02]' : 'text-gray-600'}`}>
                                    {BACKGROUND_GACHA_PRICE} COINS
                                </span>
                            </div>
                            <button
                                onClick={handleBgGacha}
                                disabled={isBgGacha || (userStats.availableCoins ?? 0) < BACKGROUND_GACHA_PRICE}
                                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-[#FC4C02] text-white hover:bg-[#e04402] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isBgGacha ? <Loader2 className="animate-spin w-3 h-3" /> : <Shuffle className="w-3 h-3" />}
                                {isBgGacha ? 'ROLLING...' : 'REROLL'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Clue Reveal Card */}
                <div className="relative bg-[#1a1a1a] border border-[#FC4C02] rounded-2xl overflow-hidden flex flex-col justify-between group shadow-[0_0_15px_rgba(252,76,2,0.15)]">
                    <div className="h-32 bg-[#FC4C02]/10 flex items-center justify-center relative overflow-hidden">
                        <MapPin size={32} className="text-[#FC4C02]" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-sm mb-1 text-white">Reveal Spot Clues</h3>
                        <p className="text-xs text-gray-500 mb-3">Unlock hints to find QR spots!</p>

                        <div className="mt-auto">
                            <div className="flex gap-2 mb-3 text-[10px] font-bold uppercase">
                                <span className={`${(userStats.availableCoins ?? userStats.totalPoints) >= CLUE_REVEAL_PRICE ? 'text-[#FC4C02]' : 'text-gray-600'}`}>
                                    {CLUE_REVEAL_PRICE} COINS
                                </span>
                            </div>
                            <button
                                onClick={handleRevealClues}
                                disabled={isClueLoading || (userStats.availableCoins ?? 0) < CLUE_REVEAL_PRICE}
                                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-[#FC4C02] text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isClueLoading ? <Loader2 className="animate-spin w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                {isClueLoading ? 'REVEALING...' : 'REVEAL'}
                            </button>
                        </div>
                    </div>
                </div>

                {rewards.filter((r: any) => r.title !== 'Background Reroll' && !r.title.toLowerCase().includes('clue')).map((reward: any) => (
                    <div
                        key={reward.id}
                        className={`relative bg-[#1a1a1a] border rounded-2xl overflow-hidden flex flex-col justify-between group
                            ${reward.status === 'LOCKED' ? 'border-white/[0.06] opacity-80'
                                : reward.status === 'CLAIMED' ? 'border-green-500/50'
                                    : reward.status === 'SOLD_OUT' ? 'border-red-500/50 grayscale'
                                        : 'border-white/[0.12] hover:border-[#FC4C02] transition-colors'}
                        `}
                    >
                        {/* Image / Icon Area */}
                        <div className="h-32 bg-black/50 flex items-center justify-center relative overflow-hidden">
                            {reward.status === 'LOCKED' ? (
                                reward.type === 'mystery' ? <HelpCircle size={32} className="text-gray-500 animate-pulse" /> : <Lock size={32} className="text-gray-600" />
                            ) : reward.image_url ? (
                                <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover" />
                            ) : reward.title === '???' ? (
                                <HelpCircle size={32} className="text-[#FC4C02] animate-pulse" />
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
                    <div className="col-span-full border border-dashed border-white/[0.12] rounded-2xl p-8 text-center text-gray-500 text-sm">
                        No rewards available yet. Check back soon!
                    </div>
                )}
            </div>
        </section>
    )
}
