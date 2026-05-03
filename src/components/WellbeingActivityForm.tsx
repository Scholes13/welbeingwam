'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Calendar, Camera, FileText, ChevronRight,
  Dumbbell, Heart, Users, Wallet, Sparkles,
  Clock, Flame,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Wellbeing dimensions & activities — sourced from the Excel spec
// ---------------------------------------------------------------------------

type ActivityDef = {
  name: string
  mandatory: boolean
  supportBy: 'werkudara' | 'personal'
  /** If true, description field is required */
  requiresDescription?: boolean
  /** Hint text shown below description field */
  descriptionHint?: string
  /** Duration presets (e.g. Treadmill). If set, shows duration picker instead of free input */
  durationPresets?: { label: string; minutes: number }[]
  /** Extra info/rules shown to user */
  rules?: string[]
}

type DimensionDef = {
  id: string
  name: string
  icon: typeof Dumbbell
  color: string
  /** If true, calories field is shown and required */
  requiresCalories: boolean
  activities: ActivityDef[]
}

const WELLBEING_DIMENSIONS: DimensionDef[] = [
  {
    id: 'physical',
    name: 'Physical Wellbeing',
    icon: Dumbbell,
    color: 'orange',
    requiresCalories: true,
    activities: [
      {
        name: 'Werkudara Workout Fitness',
        mandatory: true,
        supportBy: 'werkudara',
        rules: [
          'Mengikuti sesuai jadwal olahraga',
          'Durasi kegiatan 50 menit - 1 jam',
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Yoga',
        mandatory: true,
        supportBy: 'werkudara',
        rules: [
          'Mengikuti sesuai jadwal olahraga',
          'Durasi kegiatan 45 menit - 1 jam',
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Badminton',
        mandatory: false,
        supportBy: 'werkudara',
        rules: [
          'Durasi kegiatan 1-3 jam',
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Mountaineering / Hiking',
        mandatory: false,
        supportBy: 'werkudara',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Treadmill',
        mandatory: false,
        supportBy: 'werkudara',
        durationPresets: [
          { label: '20 menit', minutes: 20 },
          { label: '30 menit', minutes: 30 },
          { label: '45 menit', minutes: 45 },
          { label: '60 menit', minutes: 60 },
        ],
        rules: [
          'Minimal kegiatan: treadmill selama 20 menit',
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Olahraga Sendiri',
        mandatory: false,
        supportBy: 'personal',
        requiresDescription: true,
        descriptionHint: 'Jelaskan jenis olahraga yang dilakukan',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
    ],
  },
  {
    id: 'emotional',
    name: 'Emotional Wellbeing',
    icon: Heart,
    color: 'rose',
    requiresCalories: false,
    activities: [
      {
        name: 'Konsultasi / Konseling / Sharing Session Mental Health',
        mandatory: false,
        supportBy: 'werkudara',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Penyaluran Hobi / Minat dengan Aktivitas Sosial',
        mandatory: false,
        supportBy: 'personal',
        requiresDescription: true,
        descriptionHint: 'Jelaskan kegiatan hobi/minat yang dilakukan',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
          'Mengisi deskripsi kegiatan',
        ],
      },
    ],
  },
  {
    id: 'social',
    name: 'Social Wellbeing',
    icon: Users,
    color: 'sky',
    requiresCalories: false,
    activities: [
      {
        name: 'Team Building / Gathering / WAM / Mid-Year Recharge / Internal Activities',
        mandatory: true,
        supportBy: 'werkudara',
        rules: [
          'Data check in aplikasi',
        ],
      },
      {
        name: 'Kegiatan Sosial Luar Kantor (CSR, Bakti Sosial, Arisan, dsb)',
        mandatory: false,
        supportBy: 'personal',
        requiresDescription: true,
        descriptionHint: 'Jelaskan kegiatan sosial yang dilakukan',
        rules: [
          'Terdapat foto dokumentasi kehadiran dan tanggal pelaksanaan',
          'Kecuali arisan yang tidak ada kegiatan/setor uang',
          'Mengisi deskripsi kegiatan',
        ],
      },
      {
        name: 'CSR',
        mandatory: true,
        supportBy: 'werkudara',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Wellbeing',
    icon: Wallet,
    color: 'emerald',
    requiresCalories: false,
    activities: [
      {
        name: 'Program Tabungan atau Benefit Financial',
        mandatory: false,
        supportBy: 'personal',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
        ],
      },
      {
        name: 'Seminar / Edukasi Pengelolaan Keuangan dan Investasi',
        mandatory: true,
        supportBy: 'werkudara',
        requiresDescription: true,
        descriptionHint: 'Buat summary mengenai kegiatan yang dilaksanakan',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
          'Pembuatan summary mengenai kegiatan yang dilaksanakan',
        ],
      },
    ],
  },
  {
    id: 'spiritual',
    name: 'Spiritual Wellbeing',
    icon: Sparkles,
    color: 'amber',
    requiresCalories: false,
    activities: [
      {
        name: 'Ibadah Tidak Wajib',
        mandatory: false,
        supportBy: 'personal',
        requiresDescription: true,
        descriptionHint: 'Buat jurnaling mengenai kegiatan ibadah yang dilaksanakan',
        rules: [
          'Terdapat foto dokumentasi dan tanggal pelaksanaan',
          'Pembuatan jurnaling mengenai kegiatan yang dilaksanakan',
          'Yang tidak terhitung: Muslim (Sholat 5 waktu, Sholat Jumat, Puasa Ramadhan), Kristen/Katholik (Ibadah Sabtu/Minggu, Natal, Paskah), Hindu (Purnama, Tilem, Galungan, Nyepi)',
        ],
      },
    ],
  },
]

type Step = 'dimension' | 'activity' | 'details'

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400' },
  sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface WellbeingActivityFormProps {
  isOpen: boolean
  onClose: () => void
}

export default function WellbeingActivityForm({ isOpen, onClose }: WellbeingActivityFormProps) {
  const [step, setStep] = useState<Step>('dimension')
  const [selectedDimension, setSelectedDimension] = useState<DimensionDef | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityDef | null>(null)
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(false)
  const [dimensionDbId, setDimensionDbId] = useState<string | null>(null)

  const router = useRouter()
  const { success, error: toastError } = useToast()

  // Timer ref for form reset cleanup
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  // Resolve the DB dimension id when a dimension is picked
  useEffect(() => {
    if (!selectedDimension) return
    let cancelled = false
    const fetchDimensionId = async () => {
      try {
        const res = await fetch('/api/dimensions')
        const data = await res.json()
        const dim = data?.dimensions?.find(
          (d: { name: string }) => d.name.toLowerCase() === selectedDimension.id.toLowerCase(),
        )
        if (!cancelled && dim) setDimensionDbId(dim.id)
      } catch {
        /* fallback: will use null */
      }
    }
    fetchDimensionId()
    return () => { cancelled = true }
  }, [selectedDimension])

  // ---- helpers ----
  const resetForm = () => {
    setStep('dimension')
    setSelectedDimension(null)
    setSelectedActivity(null)
    setDescription('')
    setProofFile(null)
    setDate(new Date().toISOString().split('T')[0])
    setDuration('')
    setCalories('')
    setDimensionDbId(null)
  }

  const handleClose = () => {
    onClose()
    closeTimerRef.current = setTimeout(resetForm, 300)
  }

  const uploadProof = async (file: File) => {
    const supabase = createSupabaseBrowserClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `wellbeing-proofs/${date}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('quest-proofs')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('quest-proofs')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  const isPhysical = selectedDimension?.requiresCalories ?? false
  const needsDescription = selectedActivity?.requiresDescription ?? false

  const canSubmit =
    !!selectedDimension &&
    !!selectedActivity &&
    !!proofFile &&
    (!isPhysical || Number(calories) > 0) &&
    (!needsDescription || description.trim().length > 0)

  const handleSubmit = async () => {
    if (!canSubmit) return

    setLoading(true)
    try {
      const proofUrl = await uploadProof(proofFile!)

      const res = await fetch('/api/activities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sport',
          steps: 0,
          distance: 0,
          calories: isPhysical ? Number(calories) : 0,
          date,
          type: selectedActivity.name,
          proof_url: proofUrl,
          moving_time: duration ? Number(duration) * 60 : 0,
          dimension_id: dimensionDbId,
          description,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kegiatan')

      success('Kegiatan berhasil disubmit!')
      handleClose()
      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan kegiatan'
      console.error(e)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const colors = selectedDimension ? colorMap[selectedDimension.color] : null

  // ---- step index helpers for progress bar ----
  const STEPS: Step[] = ['dimension', 'activity', 'details']
  const currentIdx = STEPS.indexOf(step)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#111111] border-t border-white/[0.08] rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* drag handle */}
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* ---- progress indicator ---- */}
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-[#FC4C02] text-white'
                        : currentIdx > i
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {currentIdx > i ? '✓' : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10" />}
                </div>
              ))}
              <span className="text-xs text-gray-500 ml-2">
                {step === 'dimension'
                  ? 'Pilih Dimensi'
                  : step === 'activity'
                    ? 'Pilih Kegiatan'
                    : 'Detail & Bukti'}
              </span>
            </div>

            {/* ================================================================
                STEP 1 — Choose Dimension
               ================================================================ */}
            {step === 'dimension' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                <h3 className="text-lg font-bold text-white mb-4">Pilih Dimensi Wellbeing</h3>
                {WELLBEING_DIMENSIONS.map((dim) => {
                  const Icon = dim.icon
                  const c = colorMap[dim.color]
                  return (
                    <button
                      key={dim.id}
                      onClick={() => {
                        setSelectedDimension(dim)
    setSelectedActivity(null)
                        setStep('activity')
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border ${c.border} ${c.bg} hover:scale-[1.02] active:scale-[0.98] transition-all`}
                    >
                      <div className={`p-2.5 rounded-lg ${c.bg}`}>
                        <Icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <span className="text-white font-medium flex-1 text-left">{dim.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  )
                })}
              </motion.div>
            )}

            {/* ================================================================
                STEP 2 — Choose Activity
               ================================================================ */}
            {step === 'activity' && selectedDimension && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                <button
                  onClick={() => setStep('dimension')}
                  className="text-sm text-gray-500 hover:text-white mb-2 transition-colors"
                >
                  ← Kembali
                </button>
                <h3 className="text-lg font-bold text-white mb-4">
                  Pilih Kegiatan — {selectedDimension.name}
                </h3>
                {selectedDimension.activities.map((act) => (
                  <button
                    key={act.name}
                    onClick={() => {
                      setSelectedActivity(act)
                      setStep('details')
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex-1">
                      <span className="text-white font-medium block">{act.name}</span>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            act.mandatory
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {act.mandatory ? 'Wajib' : 'Tidak Wajib'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            act.supportBy === 'werkudara'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {act.supportBy === 'werkudara' ? 'Werkudara' : 'Personal'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* ================================================================
                STEP 3 — Details & Proof
               ================================================================ */}
            {step === 'details' && selectedDimension && selectedActivity && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <button
                  onClick={() => setStep('activity')}
                  className="text-sm text-gray-500 hover:text-white mb-2 transition-colors"
                >
                  ← Kembali
                </button>

                {/* selected summary */}
                <div className={`p-3 rounded-xl ${colors?.bg} ${colors?.border} border`}>
                  <p className={`text-xs ${colors?.text} font-medium`}>{selectedDimension.name}</p>
                  <p className="text-white font-bold text-sm mt-0.5">{selectedActivity.name}</p>
                </div>

                {/* Rules / ketentuan */}
                {selectedActivity.rules && selectedActivity.rules.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">Ketentuan</p>
                    <ul className="space-y-1">
                      {selectedActivity.rules.map((rule, i) => (
                        <li key={i} className="text-xs text-gray-400 flex gap-2">
                          <span className="text-gray-600 shrink-0">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Tanggal Pelaksanaan *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-gray-500 w-4 h-4" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Calories — only for Physical */}
                {isPhysical && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Kalori *
                    </label>
                    <div className="relative">
                      <Flame className="absolute left-3.5 top-3 text-gray-500 w-4 h-4" />
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        placeholder="contoh: 320"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-600">
                      Wajib diisi untuk kegiatan Physical Wellbeing.
                    </p>
                  </div>
                )}

                {/* Duration — preset buttons for Treadmill, free input for others */}
                {selectedActivity.durationPresets ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Durasi *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedActivity.durationPresets.map((preset) => (
                        <button
                          key={preset.minutes}
                          type="button"
                          onClick={() => setDuration(String(preset.minutes))}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            duration === String(preset.minutes)
                              ? 'bg-[#FC4C02] text-white border-[#FC4C02] shadow-lg shadow-[#FC4C02]/20'
                              : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Durasi (menit) — opsional
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-3 text-gray-500 w-4 h-4" />
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="contoh: 60"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    {needsDescription
                      ? (selectedActivity.descriptionHint
                          ? selectedActivity.descriptionHint + ' *'
                          : 'Deskripsi Kegiatan *')
                      : 'Deskripsi Kegiatan — opsional'}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 text-gray-500 w-4 h-4" />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={selectedActivity.descriptionHint || 'Jelaskan kegiatan yang dilakukan...'}
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02]/40 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Photo Proof */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Foto Dokumentasi *
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-3.5 text-sm text-gray-400 cursor-pointer hover:border-[#FC4C02]/30 hover:bg-white/[0.04] transition-all">
                    <Camera className="w-5 h-5 text-gray-500" />
                    <span className="truncate">
                      {proofFile ? proofFile.name : 'Upload foto bukti kegiatan'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {proofFile && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(proofFile)}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* info box */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-400">
                    📋 Kegiatan dan poin akan langsung tercatat. Pastikan foto dokumentasi jelas dan deskripsi lengkap.
                  </p>
                </div>

                {/* submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !canSubmit}
                  className="w-full bg-[#FC4C02] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#FC4C02]/20 disabled:shadow-none"
                >
                  {loading ? 'Mengirim...' : 'Submit Kegiatan'}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
