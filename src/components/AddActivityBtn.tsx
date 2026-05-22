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

type ActivityType = {
    id: string
    code: string
    name: string
    mode: ActivityMode
    dimension_id: string | null
    points: number
    requires_steps: boolean
    requires_calories: boolean
    is_custom_input: boolean
    is_active: boolean
    sort_order: number
}

export default function AddActivityBtn() {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<ActivityMode>('daily')
    const [steps, setSteps] = useState('')
    const [calories, setCalories] = useState('')
    const [activityType, setActivityType] = useState('')
    const [proofFiles, setProofFiles] = useState<File[]>([])
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [description, setDescription] = useState('')
    const [customName, setCustomName] = useState('')
    const [loading, setLoading] = useState(false)

    // Dimension & activity type state — sourced from /api/activity-types (CMS)
    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
    const [selectedDimensionId, setSelectedDimensionId] = useState<string>('')
    const [selectedJenisKegiatan, setSelectedJenisKegiatan] = useState<string>('')

    const router = useRouter()
    const { success, error: toastError } = useToast()

    // Fetch dimensions + activity catalog when modal opens
    useEffect(() => {
        if (!isOpen) return
        if (dimensions.length === 0) {
            fetchJson<{ dimensions?: Dimension[] }>('/api/dimensions')
                .then((data) => setDimensions(data.dimensions || []))
                .catch(() => {})
        }
        if (activityTypes.length === 0) {
            fetchJson<{ types?: ActivityType[] }>('/api/activity-types')
                .then((data) => setActivityTypes(data.types || []))
                .catch(() => {})
        }
    }, [isOpen])

    // Default selections once both lists are ready
    useEffect(() => {
        if (!isOpen) return
        if (dimensions.length > 0 && !selectedDimensionId) {
            const physical = dimensions.find((d) => d.name === 'physical')
            if (physical) setSelectedDimensionId(physical.id)
        }
        if (activityTypes.length > 0 && !activityType) {
            const firstSport = activityTypes.find((t) => t.mode === 'sport')
            if (firstSport) setActivityType(firstSport.name)
        }
    }, [isOpen, dimensions, activityTypes, selectedDimensionId, activityType])

    const jenisKegiatanOptions = activityTypes.filter(
        (t) => t.mode === 'daily' && t.dimension_id === selectedDimensionId,
    )
    const sportOptions = activityTypes.filter((t) => t.mode === 'sport')
    const selectedActivityConfig = jenisKegiatanOptions.find((a) => a.name === selectedJenisKegiatan)
    const selectedSportConfig = sportOptions.find((a) => a.name === activityType)
    const hasInvalidSportSelection = mode === 'sport' && Boolean(activityType) && !selectedSportConfig

    // Sync default jenisKegiatan when dimension changes / list arrives
    useEffect(() => {
        if (jenisKegiatanOptions.length === 0) {
            if (selectedJenisKegiatan) setSelectedJenisKegiatan('')
            return
        }
        const stillValid = jenisKegiatanOptions.some((a) => a.name === selectedJenisKegiatan)
        if (!stillValid) setSelectedJenisKegiatan(jenisKegiatanOptions[0].name)
    }, [jenisKegiatanOptions, selectedJenisKegiatan])

    const resetForm = () => {
        setMode('daily')
        setSteps('')
        setCalories('')
        const firstSport = activityTypes.find((t) => t.mode === 'sport')
        setActivityType(firstSport?.name || '')
        setProofFiles([])
        setDescription('')
        setCustomName('')
        setDate(new Date().toISOString().split('T')[0])
        const physical = dimensions.find((d) => d.name === 'physical')
        if (physical) setSelectedDimensionId(physical.id)
        // jenis kegiatan reset is handled by the sync effect
    }

    const uploadProof = async (file: File, index: number) => {
        const supabase = createSupabaseBrowserClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `activity-proofs/${date}/${Date.now()}-${index}.${ext}`

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
        if (mode === 'daily' && proofFiles.length === 0) return
        if (mode === 'daily' && selectedActivityConfig?.requires_steps && !steps) return
        if (mode === 'daily' && selectedActivityConfig?.is_custom_input && !customName.trim()) return
        if (mode === 'sport' && (!calories || proofFiles.length === 0 || hasInvalidSportSelection)) return

        setLoading(true)

        try {
            const proofUrls = proofFiles.length > 0
                ? await Promise.all(proofFiles.map((file, i) => uploadProof(file, i)))
                : []

            const res = await fetch('/api/activities/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    steps: selectedActivityConfig?.requires_steps ? Number(steps || 0) : 0,
                    distance: 0,
                    calories: mode === 'sport' ? Number(calories) : 0,
                    date,
                    type: mode === 'sport' ? activityType : selectedJenisKegiatan || 'Daily Activity',
                    proof_url: proofUrls[0] ?? null,
                    proof_urls: proofUrls,
                    dimension_id: mode === 'daily' ? selectedDimensionId || null : null,
                    description: description.trim() || null,
                    custom_name:
                        ((mode === 'daily' && selectedActivityConfig?.is_custom_input)
                            || (mode === 'sport' && selectedSportConfig?.is_custom_input))
                            ? customName.trim() || null
                            : null,
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
                                                {jenisKegiatanOptions.length === 0 ? (
                                                    <option value="" className="bg-[#1a1a1a] text-white">— Tidak ada kegiatan —</option>
                                                ) : (
                                                    jenisKegiatanOptions.map((act) => (
                                                        <option key={act.id} value={act.name} className="bg-[#1a1a1a] text-white">
                                                            {act.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        {/* Steps — hanya muncul jika kegiatan "Steps" dipilih */}
                                        {selectedActivityConfig?.requires_steps && (
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

                                        {/* Nama Kegiatan — hanya muncul kalau kegiatan "Lainnya" dipilih */}
                                        {selectedActivityConfig?.is_custom_input && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                                                    Nama Kegiatan <span className="text-[#FC4C02]">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customName}
                                                    onChange={(e) => setCustomName(e.target.value)}
                                                    maxLength={200}
                                                    placeholder="Contoh: Workshop Public Speaking"
                                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                                />
                                                <p className="mt-1 text-[11px] text-gray-600">Sebutkan nama spesifik kegiatan yang kamu lakukan.</p>
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

                                        {/* Foto Dokumentasi — selalu ada (multi-upload) */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Foto Dokumentasi</label>
                                            <label className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-3.5 text-sm text-gray-400 cursor-pointer hover:border-[#FC4C02]/30 hover:bg-white/[0.04] transition-all">
                                                <span className="truncate">
                                                    {proofFiles.length > 0
                                                        ? `${proofFiles.length} foto dipilih — tap untuk tambah`
                                                        : 'Tap untuk upload foto (bisa lebih dari 1)'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || [])
                                                        if (files.length > 0) setProofFiles((prev) => [...prev, ...files])
                                                        e.target.value = ''
                                                    }}
                                                />
                                            </label>
                                            {proofFiles.length > 0 && (
                                                <div className="mt-2 grid grid-cols-3 gap-2">
                                                    {proofFiles.map((file, idx) => (
                                                        <div key={`${file.name}-${idx}`} className="relative rounded-lg overflow-hidden border border-white/10 group">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={`Preview ${idx + 1}`}
                                                                className="w-full h-20 object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setProofFiles((prev) => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition-colors"
                                                                aria-label="Hapus foto"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Activity Type</label>
                                            <select
                                                value={activityType}
                                                onChange={(e) => { setActivityType(e.target.value); setCustomName('') }}
                                                className="w-full appearance-none bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                            >
                                                {sportOptions.length === 0 ? (
                                                    <option value="" className="bg-[#1a1a1a] text-white">— Tidak ada pilihan —</option>
                                                ) : (
                                                    sportOptions.map((option) => (
                                                        <option key={option.id} value={option.name} className="bg-[#1a1a1a] text-white">{option.name}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        {selectedSportConfig?.is_custom_input && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                                                    Nama Olahraga <span className="text-[#FC4C02]">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customName}
                                                    onChange={(e) => setCustomName(e.target.value)}
                                                    maxLength={200}
                                                    placeholder="Contoh: Padel, Boxing, Dance Fitness"
                                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                                                />
                                                <p className="mt-1 text-[11px] text-gray-600">Sebutkan nama olahraga yang kamu lakukan.</p>
                                            </div>
                                        )}

                                        {hasInvalidSportSelection && (
                                            <p className="text-xs text-red-400">Activity type tidak tersedia. Pilih ulang dari daftar.</p>
                                        )}

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
                                                <span className="truncate">
                                                    {proofFiles.length > 0
                                                        ? `${proofFiles.length} photo(s) selected — tap to add more`
                                                        : 'Tap to upload photo (multiple allowed)'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || [])
                                                        if (files.length > 0) setProofFiles((prev) => [...prev, ...files])
                                                        e.target.value = ''
                                                    }}
                                                />
                                            </label>
                                            {proofFiles.length > 0 && (
                                                <div className="mt-2 grid grid-cols-3 gap-2">
                                                    {proofFiles.map((file, idx) => (
                                                        <div key={`${file.name}-${idx}`} className="relative rounded-lg overflow-hidden border border-white/10">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={`Preview ${idx + 1}`}
                                                                className="w-full h-20 object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setProofFiles((prev) => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition-colors"
                                                                aria-label="Remove photo"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (mode === 'daily'
                                        ? (proofFiles.length === 0 || !selectedJenisKegiatan || (selectedActivityConfig?.requires_steps && !steps))
                                        : !calories || proofFiles.length === 0 || !activityType || hasInvalidSportSelection || (selectedSportConfig?.is_custom_input && !customName.trim()))}
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
