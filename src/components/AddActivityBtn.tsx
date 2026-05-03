'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useToast } from '@/context/ToastContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isDowngradeModeClient } from '@/lib/downgrade'
import { fetchJson } from '@/lib/fetch-json'
import WellbeingActivityForm from '@/components/WellbeingActivityForm'

type ActivityMode = 'daily' | 'sport'

type Dimension = {
    id: string
    name: string
    display_name: string
}

/* Jenis kegiatan per dimensi sesuai Excel "JENIS WELLBEING" */
type ActivityConfig = {
    label: string
    requiresSteps: boolean  // only for physical "Steps" activity
}

const ACTIVITIES_BY_DIMENSION: Record<string, ActivityConfig[]> = {
    physical: [
        { label: 'Werkudara Workout Fitness', requiresSteps: false },
        { label: 'Yoga', requiresSteps: false },
        { label: 'Badminton', requiresSteps: false },
        { label: 'Mountaineering / Hiking', requiresSteps: false },
        { label: 'Treadmill', requiresSteps: false },
        { label: 'Olahraga yang Dilakukan Sendiri', requiresSteps: false },
        { label: 'Steps', requiresSteps: true },
    ],
    emotional: [
        { label: 'Konsultasi / Konseling / Sharing Session Mental Health', requiresSteps: false },
        { label: 'Penyaluran Hobi / Minat dengan Aktivitas Sosial', requiresSteps: false },
    ],
    social: [
        { label: 'Team Building / Gathering / WAM / Internal Activities', requiresSteps: false },
        { label: 'Kegiatan Sosial di Luar Kantor (CSR, Bakti Sosial, Arisan, dsb)', requiresSteps: false },
        { label: 'CSR', requiresSteps: false },
    ],
    financial: [
        { label: 'Program Tabungan atau Benefit Financial', requiresSteps: false },
        { label: 'Seminar & Edukasi Pengelolaan Keuangan dan Investasi', requiresSteps: false },
    ],
    spiritual: [
        { label: 'Ibadah Tidak Wajib', requiresSteps: false },
    ],
}

const SPORT_OPTIONS = ['Running', 'Cycling', 'Swimming', 'Workout', 'Badminton', 'Futsal', 'Other']

export default function AddActivityBtn() {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<ActivityMode>('daily')
    const [steps, setSteps] = useState('')
    const [calories, setCalories] = useState('')
    const [activityType, setActivityType] = useState(SPORT_OPTIONS[0])
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    // Dimension & activity type state
    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [selectedDimensionId, setSelectedDimensionId] = useState<string>('')
    const [selectedJenisKegiatan, setSelectedJenisKegiatan] = useState<string>('')

    const router = useRouter()
    const { success, error: toastError } = useToast()

    // Fetch dimensions when modal opens
    useEffect(() => {
        if (!isOpen || dimensions.length > 0) return
        fetchJson<{ dimensions?: Dimension[] }>('/api/dimensions')
            .then((data) => {
                const dims = data.dimensions || []
                setDimensions(dims)
                const physical = dims.find((d) => d.name === 'physical')
                if (physical && !selectedDimensionId) {
                    setSelectedDimensionId(physical.id)
                    const activities = ACTIVITIES_BY_DIMENSION['physical'] || []
                    setSelectedJenisKegiatan(activities[0]?.label || '')
                }
            })
            .catch(() => {})
    }, [isOpen])

    const selectedDimension = dimensions.find((d) => d.id === selectedDimensionId)
    const jenisKegiatanOptions = ACTIVITIES_BY_DIMENSION[selectedDimension?.name || ''] || []
    const selectedActivityConfig = jenisKegiatanOptions.find((a) => a.label === selectedJenisKegiatan)

    const resetForm = () => {
        setMode('daily')
        setSteps('')
        setCalories('')
        setActivityType(SPORT_OPTIONS[0])
        setProofFile(null)
        setDescription('')
        setDate(new Date().toISOString().split('T')[0])
        const physical = dimensions.find((d) => d.name === 'physical')
        if (physical) {
            setSelectedDimensionId(physical.id)
            const activities = ACTIVITIES_BY_DIMENSION['physical'] || []
            setSelectedJenisKegiatan(activities[0]?.label || '')
        }
    }

    const uploadProof = async (file: File) => {
        const supabase = createSupabaseBrowserClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `activity-proofs/${date}/${Date.now()}.${ext}`

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
        if (mode === 'daily' && !proofFile) return
        if (mode === 'daily' && selectedActivityConfig?.requiresSteps && !steps) return
        if (mode === 'sport' && (!calories || !proofFile)) return

        setLoading(true)

        try {
            let proofUrl: string | null = null
            if (proofFile) {
                proofUrl = await uploadProof(proofFile)
            }

            const res = await fetch('/api/activities/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    steps: selectedActivityConfig?.requiresSteps ? Number(steps || 0) : 0,
                    distance: 0,
                    calories: mode === 'sport' ? Number(calories) : 0,
                    date,
                    type: mode === 'sport' ? activityType : selectedJenisKegiatan || 'Daily Activity',
                    proof_url: proofUrl,
                    dimension_id: mode === 'daily' ? selectedDimensionId || null : null,
                    description: description.trim() || null,
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
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to save activity'
            console.error(e)
            toastError(message)
        } finally {
            setLoading(false)
        }
    }

    // --- Downgrade mode ---
    if (isDowngradeModeClient()) {
        return (
            <>
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-32 right-5 bg-[#FC4C02] text-white p-3.5 rounded-2xl shadow-lg shadow-[#FC4C02]/20 z-40 hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Add activity"
                >
                    <Plus size={22} />
                </button>
                <WellbeingActivityForm isOpen={isOpen} onClose={() => setIsOpen(false)} />
            </>
        )
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-32 right-5 bg-[#FC4C02] text-white p-3.5 rounded-2xl shadow-lg shadow-[#FC4C02]/20 z-40 hover:scale-105 active:scale-95 transition-transform"
                aria-label="Add activity"
            >
                <Plus size={22} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[#111111] border border-white/[0.08] rounded-3xl p-6 pb-8 shadow-2xl mx-4 max-h-[85vh] overflow-y-auto"
                        >
                            {/* Drag handle */}
                            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-lg font-bold mb-6 text-white">Add Activity</h3>

                            <div className="grid grid-cols-2 gap-1.5 mb-6 rounded-xl bg-white/[0.04] p-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('daily')}
                                    className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${mode === 'daily' ? 'bg-[#FC4C02] text-white shadow-lg shadow-[#FC4C02]/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Daily Activity
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('sport')}
                                    className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${mode === 'sport' ? 'bg-[#FC4C02] text-white shadow-lg shadow-[#FC4C02]/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Sport Session
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                    />
                                </div>

                                {mode === 'daily' ? (
                                    <>
                                        {/* Dropdown Dimensi Wellbeing */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Dimension</label>
                                            <select
                                                value={selectedDimensionId}
                                                onChange={(e) => {
                                                    setSelectedDimensionId(e.target.value)
                                                    const dim = dimensions.find((d) => d.id === e.target.value)
                                                    const activities = ACTIVITIES_BY_DIMENSION[dim?.name || ''] || []
                                                    setSelectedJenisKegiatan(activities[0]?.label || '')
                                                    setDescription('')
                                                }}
                                                className="w-full appearance-none bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                            >
                                                {dimensions.map((dim) => (
                                                    <option key={dim.id} value={dim.id} className="bg-[#1a1a1a] text-white">{dim.display_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Dropdown Jenis Kegiatan sesuai dimensi */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Jenis Kegiatan</label>
                                            <select
                                                value={selectedJenisKegiatan}
                                                onChange={(e) => { setSelectedJenisKegiatan(e.target.value); setDescription(''); setSteps('') }}
                                                className="w-full appearance-none bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                            >
                                                {jenisKegiatanOptions.map((act) => (
                                                    <option key={act.label} value={act.label} className="bg-[#1a1a1a] text-white">{act.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Steps — hanya muncul jika kegiatan "Steps" dipilih */}
                                        {selectedActivityConfig?.requiresSteps && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Jumlah Langkah</label>
                                                <input
                                                    type="number"
                                                    value={steps}
                                                    onChange={(e) => setSteps(e.target.value)}
                                                    placeholder="e.g. 5000"
                                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                                />
                                                <p className="mt-1 text-[11px] text-gray-600">1 poin per 10 langkah.</p>
                                            </div>
                                        )}

                                        {/* Deskripsi — selalu ada */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Deskripsi Kegiatan</label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors resize-none"
                                                placeholder="Jelaskan kegiatan yang dilakukan..."
                                                rows={3}
                                            />
                                        </div>

                                        {/* Foto Dokumentasi — selalu ada */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Foto Dokumentasi</label>
                                            <label className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-3.5 text-sm text-gray-400 cursor-pointer hover:border-[#FC4C02]/30 hover:bg-white/[0.04] transition-all">
                                                <span className="truncate">{proofFile ? proofFile.name : 'Tap untuk upload foto'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                            {proofFile && (
                                                <button type="button" onClick={() => setProofFile(null)} className="text-[11px] text-red-400 mt-1.5 hover:text-red-300">
                                                    Hapus foto
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Activity Type</label>
                                            <select
                                                value={activityType}
                                                onChange={(e) => setActivityType(e.target.value)}
                                                className="w-full appearance-none bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                            >
                                                {SPORT_OPTIONS.map((option) => (
                                                    <option key={option} value={option} className="bg-[#1a1a1a] text-white">{option}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Calories</label>
                                            <input
                                                type="number"
                                                value={calories}
                                                onChange={(e) => setCalories(e.target.value)}
                                                placeholder="e.g. 320"
                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                            />
                                            <p className="mt-1.5 text-[11px] text-gray-600">Sport points are 1:1 with calories and go to Physical.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Photo Proof</label>
                                            <label className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-3.5 text-sm text-gray-400 cursor-pointer hover:border-[#FC4C02]/30 hover:bg-white/[0.04] transition-all">
                                                <span className="truncate">{proofFile ? proofFile.name : 'Tap to upload photo'}</span>
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
                                    disabled={loading || (mode === 'daily'
                                        ? (!proofFile || (selectedActivityConfig?.requiresSteps && !steps))
                                        : !calories || !proofFile)}
                                    className="w-full bg-[#FC4C02] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#FC4C02]/20 disabled:shadow-none"
                                >
                                    {loading ? 'Saving...' : mode === 'sport' ? 'Save Sport Session' : 'Simpan Kegiatan'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
