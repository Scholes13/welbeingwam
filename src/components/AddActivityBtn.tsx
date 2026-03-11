'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Footprints, MapPin, Calendar, Plus, Flame, Camera, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useToast } from '@/context/ToastContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type ActivityMode = 'daily' | 'sport'

const SPORT_OPTIONS = ['Running', 'Cycling', 'Swimming', 'Workout', 'Badminton', 'Futsal', 'Other']

export default function AddActivityBtn() {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<ActivityMode>('daily')
    const [steps, setSteps] = useState('')
    const [distance, setDistance] = useState('')
    const [calories, setCalories] = useState('')
    const [activityType, setActivityType] = useState(SPORT_OPTIONS[0])
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)

    const router = useRouter()
    const { success, error: toastError } = useToast()

    const resetForm = () => {
        setMode('daily')
        setSteps('')
        setDistance('')
        setCalories('')
        setActivityType(SPORT_OPTIONS[0])
        setProofFile(null)
        setDate(new Date().toISOString().split('T')[0])
    }

    const uploadSportProof = async (file: File) => {
        const supabase = createSupabaseBrowserClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `sport-sessions/${date}/${Date.now()}.${ext}`

        const { data, error } = await supabase.storage
            .from('quest-proofs')
            .upload(path, file, { contentType: file.type, upsert: false })

        if (error) throw error

        const { data: urlData } = supabase.storage
            .from('quest-proofs')
            .getPublicUrl(data.path)

        return urlData.publicUrl
    }

    const handleSubmit = async () => {
        if (mode === 'daily' && !steps) return
        if (mode === 'sport' && (!calories || !proofFile)) return

        setLoading(true)

        try {
            let proofUrl: string | null = null
            if (mode === 'sport' && proofFile) {
                proofUrl = await uploadSportProof(proofFile)
            }

            const res = await fetch('/api/activities/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    steps: mode === 'daily' ? Number(steps) : 0,
                    distance: distance ? Number(distance) : 0,
                    calories: mode === 'sport' ? Number(calories) : 0,
                    date,
                    type: mode === 'sport' ? activityType : 'Daily Activity',
                    proof_url: proofUrl,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save activity')
            }

            success(mode === 'sport' ? 'Sport session saved' : 'Daily activity saved')
            setIsOpen(false)
            resetForm()
            router.refresh()
            window.location.reload()
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to save activity'
            console.error(e)
            toastError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 bg-[#FC4C02] text-white p-4 rounded-full shadow-2xl z-40 hover:scale-110 transition-transform"
                aria-label="Add activity"
            >
                <Plus size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold mb-6">Tambah Aktivitas</h3>

                            <div className="grid grid-cols-2 gap-2 mb-5 rounded-xl bg-black/40 p-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('daily')}
                                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === 'daily' ? 'bg-[#FC4C02] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Daily Activity
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('sport')}
                                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === 'sport' ? 'bg-[#FC4C02] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Sport Session
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>
                                </div>

                                {mode === 'daily' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Steps</label>
                                            <div className="relative">
                                                <Footprints className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={steps}
                                                    onChange={(e) => setSteps(e.target.value)}
                                                    placeholder="e.g. 5000"
                                                    className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Distance (optional)</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={distance}
                                                    onChange={(e) => setDistance(e.target.value)}
                                                    placeholder="meters"
                                                    className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-500">Step points use the existing 1 point per 10 steps rule.</p>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Activity Type</label>
                                            <div className="relative">
                                                <Activity className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                                <select
                                                    value={activityType}
                                                    onChange={(e) => setActivityType(e.target.value)}
                                                    className="w-full appearance-none bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                >
                                                    {SPORT_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Calories</label>
                                            <div className="relative">
                                                <Flame className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={calories}
                                                    onChange={(e) => setCalories(e.target.value)}
                                                    placeholder="e.g. 320"
                                                    className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                />
                                            </div>
                                            <p className="mt-2 text-[11px] text-gray-500">Sport points are 1:1 with calories and go to Physical.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Distance (optional)</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={distance}
                                                    onChange={(e) => setDistance(e.target.value)}
                                                    placeholder="meters"
                                                    className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Photo Proof</label>
                                            <label className="flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black px-3 py-3 text-sm text-gray-300 cursor-pointer hover:border-[#FC4C02]/50">
                                                <Camera className="w-4 h-4 text-gray-500" />
                                                <span className="truncate">{proofFile ? proofFile.name : 'Upload sport proof photo'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (mode === 'daily' ? !steps : !calories || !proofFile)}
                                    className="w-full bg-[#FC4C02] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Saving...' : mode === 'sport' ? 'Save Sport Session' : 'Save Daily Activity'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
