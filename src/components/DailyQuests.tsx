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

export default function DailyQuests({ quests = [], userQuests = [], onClaim, showAll = false, includeCompleted = false }: any) {
    const [loadingIds, setLoadingIds] = useState<string[]>([])
    const [successIds, setSuccessIds] = useState<string[]>([])
    const [errorData, setErrorData] = useState<{ [key: string]: string }>({})
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [selectedQuest, setSelectedQuest] = useState<any>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [verificationNote, setVerificationNote] = useState('')
    const [uploading, setUploading] = useState(false)

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

    if (filteredQuests.length === 0) return null
    const visibleQuests = showAll ? filteredQuests : filteredQuests.slice(0, 3)

    return (
        <section className="mb-8">
            {!showAll && (
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
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative border p-5 rounded-2xl flex items-center gap-4 transition-colors ${errorMessage ? 'bg-red-500/10 border-red-500/50' : 'bg-[#1a1a1a] border-white/10'
                                    }`}
                            >
                                <div className="z-10 flex-1 min-w-0 flex flex-col gap-1">
                                    <h3 className="font-bold text-white leading-snug break-words pr-2">
                                        {quest.title}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-2">{quest.description}</p>

                                    {/* Footer Info: Badge + Timer */}
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        {quest.dimension && (
                                            <span className="flex items-center gap-1 text-xs text-orange-300/70 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                                {(() => {
                                                    const IconComp = dimensionIcons[quest.dimension.icon]
                                                    return IconComp ? <IconComp className="w-3 h-3" /> : null
                                                })()}
                                                {quest.dimension.display_name}
                                            </span>
                                        )}
                                        <span className="bg-[#FC4C02]/20 text-[#FC4C02] text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
                                            +{quest.points} PTS
                                        </span>

                                        <div className="h-5 flex items-center">
                                            {errorMessage ? (
                                                <div className="text-xs font-bold text-red-500 flex items-center gap-1">
                                                    <XCircle size={12} /> {errorMessage}
                                                </div>
                                            ) : timeLeft ? (
                                                <div className="text-xs font-mono font-bold text-yellow-500 flex items-center gap-1.5">
                                                    <Timer className="w-3.5 h-3.5" />
                                                    {timeLeft}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="z-10 shrink-0 self-center">
                                    <motion.button
                                        onClick={() => !isCompleted && handleClaim(quest)}
                                        disabled={isLoading || isSuccess || isCompleted}
                                        whileTap={{ scale: 0.95 }}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs min-w-[90px] flex justify-center items-center overflow-hidden relative transition-all shadow-lg ${isSuccess || isCompleted
                                            ? 'bg-green-500 text-white shadow-green-500/20'
                                            : errorMessage
                                                ? 'bg-red-500 text-white'
                                                : 'bg-white text-black hover:bg-gray-200 shadow-white/10'
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
                                                    <Loader2 size={16} className="animate-spin" />
                                                </motion.div>
                                            ) : isSuccess || isCompleted ? (
                                                <motion.div
                                                    key="success"
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Check size={16} />
                                                </motion.div>
                                            ) : (
                                                <motion.span
                                                    key="idle"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    {errorMessage ? 'Retry' : 'Done'}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {showPhotoModal && selectedQuest && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-2">Upload Bukti</h3>
                        <p className="text-sm text-gray-400 mb-4">{selectedQuest.title}</p>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                            className="w-full mb-4 text-sm text-gray-400"
                        />
                        {photoFile && (
                            <p className="text-xs text-green-400 mb-2">{photoFile.name}</p>
                        )}
                        <textarea
                            placeholder="Catatan (opsional)..."
                            value={verificationNote}
                            onChange={(e) => setVerificationNote(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-3 py-2 text-sm mb-4 text-white"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setVerificationNote('') }}
                                className="flex-1 py-2 rounded-lg bg-gray-800 text-sm text-white"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handlePhotoSubmit}
                                disabled={!photoFile || uploading}
                                className="flex-1 py-2 rounded-lg bg-[#FC4C02] text-sm font-bold text-white disabled:opacity-50"
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
