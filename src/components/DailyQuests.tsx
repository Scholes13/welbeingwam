'use client'

import { useState, useEffect } from 'react'
import { Check, Gift, Loader2, Timer, XCircle, Activity, Heart, Brain, Users, Sparkles, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/context/ToastContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const dimensionIcons: Record<string, React.ComponentType<{className?: string}>> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    users: Users,
    sparkles: Sparkles,
    briefcase: Briefcase,
}

export default function DailyQuests({ quests = [], userQuests = [], onClaim, showAll = false, includeCompleted = false, hideHeader = false }: any) {
    const [loadingIds, setLoadingIds] = useState<string[]>([])
    const [successIds, setSuccessIds] = useState<string[]>([])
    const [errorData, setErrorData] = useState<{ [key: string]: string }>({})
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [selectedQuest, setSelectedQuest] = useState<any>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [verificationNote, setVerificationNote] = useState('')
    const [uploading, setUploading] = useState(false)
    const [streakMap, setStreakMap] = useState<Record<string, { current_streak: number; multiplier: number; event_title: string }>>({})

    const { success, error } = useToast()

    // Fetch user streaks
    useEffect(() => {
        fetch('/api/streaks')
            .then(r => r.json())
            .then(d => { if (d.streaks) setStreakMap(d.streaks) })
            .catch(() => {})
    }, [])

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
        const hasDeadline = quests.some((q: any) => q.expires_at)
        if (!hasDeadline) return
        const timer = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(timer)
    }, [quests])

    const uploadQuestPhoto = async (file: File, questId: string) => {
        const supabase = createSupabaseBrowserClient()
        const ext = file.name.split('.').pop()
        const path = `proofs/${questId}/${Date.now()}.${ext}`

        const { data, error: uploadError } = await supabase.storage
            .from('quest-proofs')
            .upload(path, file, { contentType: file.type })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
            .from('quest-proofs')
            .getPublicUrl(data.path)

        return urlData.publicUrl
    }

    const handleClaim = async (quest: any, photoUrl?: string) => {
        const questId = quest.id ?? quest

        // If quest requires photo and no photo provided yet, show modal
        if (quest.requires_photo && !photoUrl) {
            setSelectedQuest(quest)
            setShowPhotoModal(true)
            return
        }

        setLoadingIds(prev => [...prev, questId])
        setErrorData(prev => { const n = { ...prev }; delete n[questId]; return n }) // Clear previous errors

        try {
            const res = await fetch('/api/quests/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId,
                    photo_url: photoUrl || null,
                }),
            })
            const data = await res.json()

            if (res.ok) {
                // Success Animation Sequence
                setSuccessIds(prev => [...prev, questId])
                setTimeout(() => {
                    onClaim() // Refresh data after animation
                }, 1500)
            } else {
                throw new Error(data.error || 'Failed to claim')
            }
        } catch (e: any) {
            console.error(e)
            // Error Animation State
            setErrorData(prev => ({ ...prev, [questId]: e.message || 'Failed' }))
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== questId))
        }
    }

    const handlePhotoSubmit = async () => {
        if (!photoFile || !selectedQuest) return
        setUploading(true)
        try {
            const url = await uploadQuestPhoto(photoFile, selectedQuest.id)
            // Now call the claim API with photo_url
            const res = await fetch('/api/quests/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId: selectedQuest.id,
                    photo_url: url,
                    verification_note: verificationNote || null,
                }),
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            // Success - close modal, refresh
            setShowPhotoModal(false)
            setPhotoFile(null)
            setVerificationNote('')
            setSelectedQuest(null)
            onClaim()
        } catch (err: any) {
            alert(err.message || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    // Filter logic: if includeCompleted is true, show all. Else show only uncompleted.
    const filteredQuests = includeCompleted
        ? quests
        : quests.filter((q: any) => !userQuests.some((uq: any) => uq.quest_id === q.id))

    // Pre-filter expired+uncompleted so they don't consume visible slots (especially in dashboard 3-item view)
    const renderableQuests = filteredQuests.filter((q: any) => {
        const isCompleted = userQuests.some((uq: any) => uq.quest_id === q.id)
        if (!q.expires_at) return true // no deadline → always show
        const isExpired = Date.parse(q.expires_at) - Date.now() <= 0
        return !isExpired || isCompleted // hide expired+uncompleted
    })

    if (renderableQuests.length === 0) return null
    const visibleQuests = showAll ? renderableQuests : renderableQuests.slice(0, 3)

    return (
        <section className="mb-8">
            {!showAll && !hideHeader && (
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
            )}

            <div className="space-y-4">
                <AnimatePresence>
                    {visibleQuests.map((quest: any) => {
                        const isLoading = loadingIds.includes(quest.id)
                        const isSuccess = successIds.includes(quest.id)
                        const errorMessage = errorData[quest.id]

                        const timeLeft = quest.expires_at ? getCountdown(quest.expires_at) : null
                        const isExpired = timeLeft === 'Expired'

                        const isCompleted = userQuests.some((uq: any) => uq.quest_id === quest.id)

                        if (isExpired && !isCompleted) return null

                        return (
                            <motion.div
                                key={quest.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
                                    errorMessage
                                        ? 'bg-red-500/[0.06] border border-red-500/30'
                                        : isCompleted || isSuccess
                                            ? 'bg-emerald-500/[0.04] border border-emerald-500/15'
                                            : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 p-4">
                                    <div className="z-10 flex-1 min-w-0 flex flex-col gap-1.5">
                                        <h3 className="text-sm font-bold text-white leading-snug break-words pr-2">
                                            {quest.title}
                                        </h3>
                                        <p className="text-gray-500 text-xs line-clamp-1">{quest.description}</p>

                                        {/* Footer Info: Badge + Timer */}
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {quest.dimension && (
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-orange-300/80 bg-orange-500/10 px-2 py-0.5 rounded-md">
                                                    {(() => {
                                                        const IconComp = dimensionIcons[quest.dimension.icon]
                                                        return IconComp ? <IconComp className="w-3 h-3" /> : null
                                                    })()}
                                                    {quest.dimension.display_name}
                                                </span>
                                            )}
                                            <span className="bg-[#FC4C02]/15 text-[#FC4C02] text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
                                                +{quest.points} PTS
                                            </span>

                                            {quest.dimension_id && streakMap[quest.dimension_id] && streakMap[quest.dimension_id].current_streak > 0 && (
                                                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md shrink-0 font-bold">
                                                    🔥 {streakMap[quest.dimension_id].current_streak}d — {streakMap[quest.dimension_id].multiplier}x
                                                </span>
                                            )}

                                            {errorMessage ? (
                                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                                    <XCircle size={10} /> {errorMessage}
                                                </span>
                                            ) : timeLeft ? (
                                                <span className="text-[10px] font-mono font-bold text-yellow-500/80 flex items-center gap-1">
                                                    <Timer className="w-3 h-3" />
                                                    {timeLeft}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="z-10 shrink-0 self-center">
                                        <motion.button
                                            onClick={() => !isCompleted && handleClaim(quest)}
                                            disabled={isLoading || isSuccess || isCompleted}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-4 py-2 rounded-xl font-bold text-xs min-w-[80px] flex justify-center items-center overflow-hidden relative transition-all ${isSuccess || isCompleted
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                : errorMessage
                                                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                                    : 'bg-white/[0.08] text-white border border-white/[0.1] hover:bg-white/[0.15]'
                                                }`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {isLoading ? (
                                                    <motion.div
                                                        key="loading"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        <Loader2 size={14} className="animate-spin" />
                                                    </motion.div>
                                                ) : isSuccess || isCompleted ? (
                                                    <motion.div
                                                        key="success"
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Check size={14} /> Done
                                                    </motion.div>
                                                ) : (
                                                    <motion.span
                                                        key="idle"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        {errorMessage ? 'Retry' : 'Claim'}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {showPhotoModal && selectedQuest && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold mb-1.5 text-white">Upload Bukti</h3>
                        <p className="text-xs text-gray-500 mb-5">{selectedQuest.title}</p>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                            className="w-full mb-4 text-sm text-gray-400"
                        />
                        {photoFile && (
                            <p className="text-xs text-emerald-400 mb-3">{photoFile.name}</p>
                        )}
                        <textarea
                            placeholder="Catatan (opsional)..."
                            value={verificationNote}
                            onChange={(e) => setVerificationNote(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm mb-5 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                            rows={2}
                        />
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setVerificationNote('') }}
                                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white hover:bg-white/[0.1] transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handlePhotoSubmit}
                                disabled={!photoFile || uploading}
                                className="flex-1 py-2.5 rounded-xl bg-[#FC4C02] text-sm font-bold text-white disabled:opacity-40 hover:bg-orange-600 transition-colors"
                            >
                                {uploading ? 'Uploading...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
