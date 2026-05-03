# Wellbeing Downgrade: Form Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Downgrade the wellbeing app to "Google Form mode" — disable auto-calculate points, Strava integration, and quest auto-generation at the code level while keeping the database schema intact. User submits activities via a simple form (pilih dimensi → jenis kegiatan → foto → deskripsi). HR must manually review, approve, and input points. QR attendance system for badminton & internal activities remains active.

**Architecture:** Feature-flag approach using a `DOWNGRADE_MODE` environment variable. When enabled, auto-point calculation returns 0 (pending HR input), Strava sync is short-circuited, and quest generation is skipped. The AddActivityBtn is redesigned to support all 5 wellbeing dimensions (Physical, Emotional, Social, Financial, Spiritual) with photo proof and description. Admin panel gets a new review queue where HR manually assigns points.

**Tech Stack:** Next.js App Router, Supabase, TypeScript, Tailwind CSS, Framer Motion

**Revert Strategy:** Set `DOWNGRADE_MODE=false` or remove the env var → everything returns to normal. Database untouched throughout.

---

## File Structure

### New Files
- `src/lib/downgrade.ts` — Feature flag helper, single source of truth for downgrade mode
- `src/components/WellbeingActivityForm.tsx` — New multi-dimension activity submission form (replaces AddActivityBtn content in downgrade mode)
- `src/app/api/admin/activities/review/route.ts` — New API route for HR to approve/reject + manually assign points

### Modified Files
- `.env.local` — Add `NEXT_PUBLIC_DOWNGRADE_MODE=true`
- `src/lib/points.ts` — Wrap auto-calculation with downgrade check
- `src/app/api/activities/create/route.ts` — Set `activity_points=0`, `review_status='pending'` in downgrade mode
- `src/app/api/strava/sync/route.ts` — Short-circuit sync in downgrade mode
- `src/lib/quest-templates.ts` — Skip generation in downgrade mode
- `src/components/AddActivityBtn.tsx` — Swap to WellbeingActivityForm in downgrade mode
- `src/app/dashboard/admin/page.tsx` — Add review queue tab for pending activities

### Untouched (Critical)
- All `supabase/migrations/*` — NO database changes
- `src/app/api/activity/scan/route.ts` — QR scan attendance STAYS ACTIVE
- `src/app/api/admin/attendance/scan/route.ts` — Admin QR scan STAYS ACTIVE
- `src/app/api/spots/scan/route.ts` — Spot QR scan STAYS ACTIVE

---

## Chunk 1: Downgrade Infrastructure & Points Disable

### Task 1: Create Downgrade Feature Flag Helper

**Files:**
- Create: `src/lib/downgrade.ts`

- [ ] **Step 1: Create the downgrade helper module**

```ts
// src/lib/downgrade.ts

/**
 * Downgrade Mode Feature Flag
 * 
 * When DOWNGRADE_MODE is enabled:
 * - Auto-point calculation is disabled (returns 0, pending HR manual input)
 * - Strava sync is short-circuited
 * - Quest auto-generation is skipped
 * - Activity submission uses multi-dimension form
 * - HR must manually review & assign points
 * 
 * To revert: set NEXT_PUBLIC_DOWNGRADE_MODE=false or remove the env var
 */

export function isDowngradeMode(): boolean {
  return process.env.NEXT_PUBLIC_DOWNGRADE_MODE === 'true'
}

export function isDowngradeModeClient(): boolean {
  if (typeof window === 'undefined') return false
  return process.env.NEXT_PUBLIC_DOWNGRADE_MODE === 'true'
}
```

- [ ] **Step 2: Add env variable**

Add to `.env.local`:
```
NEXT_PUBLIC_DOWNGRADE_MODE=true
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/downgrade.ts
git commit -m "feat: add downgrade mode feature flag for form-mode operation"
```

---

### Task 2: Disable Auto-Point Calculation in Points Library

**Files:**
- Modify: `src/lib/points.ts`

The key insight: we do NOT change the math functions themselves. We only change the API route that calls them. This way, when we revert, the math is still correct.

> **Note:** `points.ts` stays unchanged. The disable happens at the API route level (Task 3). This keeps the revert clean.

- [ ] **Step 1: Verify points.ts is unchanged**

No changes needed to `src/lib/points.ts`. The functions `convertActivityPoints`, `convertStepsToPoints`, etc. remain intact. The downgrade logic is applied at the API route level where these functions are called.

---

### Task 3: Disable Auto-Points in Activity Create API

**Files:**
- Modify: `src/app/api/activities/create/route.ts`

- [ ] **Step 1: Add downgrade import and modify point assignment**

At the top of the file, add the import:
```ts
import { isDowngradeMode } from '@/lib/downgrade'
```

Then modify the insert block. Find:
```ts
            activity_points: normalizedMode === 'sport' ? convertActivityPoints(calorieCount) : 0,
```

Replace with:
```ts
            activity_points: isDowngradeMode() ? 0 : (normalizedMode === 'sport' ? convertActivityPoints(calorieCount) : 0),
```

- [ ] **Step 2: Change review_status to pending in downgrade mode**

Find:
```ts
            review_status: 'approved',
```

Replace with:
```ts
            review_status: isDowngradeMode() ? 'pending' : 'approved',
```

- [ ] **Step 3: Add dimension_id and description fields support**

The create route needs to accept `dimension_id` and `description` from the new form. Find the type definition:
```ts
type CreateActivityPayload = {
  mode?: string
  steps?: number
  distance?: number
  calories?: number
  date?: string
  type?: string
  proof_url?: string | null
  moving_time?: number
}
```

Replace with:
```ts
type CreateActivityPayload = {
  mode?: string
  steps?: number
  distance?: number
  calories?: number
  date?: string
  type?: string
  proof_url?: string | null
  moving_time?: number
  dimension_id?: string | null
  description?: string | null
}
```

Then in the destructuring, add the new fields:
```ts
const { steps, distance, calories, date, type, mode, proof_url, moving_time, dimension_id, description } = (await request.json()) as CreateActivityPayload
```

In the insert object, update `dimension_id` to use the submitted value in downgrade mode:
Find:
```ts
            dimension_id: physicalDimensionId,
```

Replace with:
```ts
            dimension_id: isDowngradeMode() && dimension_id ? dimension_id : physicalDimensionId,
```

- [ ] **Step 4: Relax sport-only validations in downgrade mode**

In downgrade mode, users submit activities across all dimensions, not just sport. The calories and proof requirements should be relaxed for non-physical dimensions. Find:
```ts
    if (normalizedMode === 'sport') {
	        if (!rawType) {
	            return NextResponse.json({ error: 'Activity type is required for sport session' }, { status: 400 })
	        }

        if (calorieCount <= 0) {
            return NextResponse.json({ error: 'Calories are required for sport session' }, { status: 400 })
        }

        if (!proof_url) {
            return NextResponse.json({ error: 'Photo proof is required for sport session' }, { status: 400 })
        }
    }
```

Replace with:
```ts
    if (normalizedMode === 'sport') {
        if (!rawType) {
            return NextResponse.json({ error: 'Activity type is required for sport session' }, { status: 400 })
        }

        if (!isDowngradeMode()) {
            if (calorieCount <= 0) {
                return NextResponse.json({ error: 'Calories are required for sport session' }, { status: 400 })
            }

            if (!proof_url) {
                return NextResponse.json({ error: 'Photo proof is required for sport session' }, { status: 400 })
            }
        } else {
            // In downgrade mode, photo proof is still required
            // Calories are required for Physical dimension activities
            if (!proof_url) {
                return NextResponse.json({ error: 'Photo proof is required' }, { status: 400 })
            }
        }
    }
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/activities/create/route.ts
git commit -m "feat: disable auto-point calculation in downgrade mode, activities land as pending"
```

---

### Task 4: Disable Strava Sync

**Files:**
- Modify: `src/app/api/strava/sync/route.ts`

- [ ] **Step 1: Short-circuit Strava sync in downgrade mode**

At the top of the file, after existing imports, add:
```ts
import { isDowngradeMode } from '@/lib/downgrade'
```

Then at the very beginning of the `GET()` function body (before any other logic), add:
```ts
    // Downgrade mode: skip Strava sync entirely
    if (isDowngradeMode()) {
      const context = await getAuthProfileContext()
      if (!context) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({
        profile: null,
        activities: [],
        totalPoints: 0,
        stepPoints: 0,
        sportPoints: 0,
        totalPhysicalPoints: 0,
        message: 'Strava sync is temporarily disabled'
      })
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/strava/sync/route.ts
git commit -m "feat: short-circuit Strava sync in downgrade mode"
```

---

### Task 5: Disable Quest Auto-Generation

**Files:**
- Modify: `src/lib/quest-templates.ts`

- [ ] **Step 1: Skip quest generation in downgrade mode**

At the top of the file, add:
```ts
import { isDowngradeMode } from '@/lib/downgrade'
```

Then at the beginning of `generateQuestsFromTemplates`, add:
```ts
  // Downgrade mode: skip quest auto-generation
  if (isDowngradeMode()) {
    return { generated: 0, skipped: true, reason: 'downgrade_mode' }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/quest-templates.ts
git commit -m "feat: skip quest auto-generation in downgrade mode"
```

---

## Chunk 2: Multi-Dimension Activity Submission Form

### Task 6: Create Wellbeing Activity Form Component

**Files:**
- Create: `src/components/WellbeingActivityForm.tsx`

This is the "Google Form style" submission form. User flow:
1. Pilih Dimensi (Physical, Emotional, Social, Financial, Spiritual)
2. Pilih Jenis Kegiatan (based on dimension, from Excel data)
3. Upload Foto Dokumentasi
4. Isi Deskripsi Kegiatan
5. Pilih Tanggal
6. Submit → lands as `pending` for HR review

- [ ] **Step 1: Create the WellbeingActivityForm component**

```tsx
// src/components/WellbeingActivityForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Calendar, Camera, FileText, ChevronRight,
  Dumbbell, Heart, Users, Wallet, Sparkles,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Wellbeing dimensions and their activities based on Excel spec
const WELLBEING_DIMENSIONS = [
  {
    id: 'physical',
    name: 'Physical Wellbeing',
    icon: Dumbbell,
    color: 'orange',
    activities: [
      { name: 'Werkudara Workout Fitness', mandatory: true, supportBy: 'werkudara' },
      { name: 'Yoga', mandatory: true, supportBy: 'werkudara' },
      { name: 'Badminton', mandatory: false, supportBy: 'werkudara' },
      { name: 'Mountaineering / Hiking', mandatory: false, supportBy: 'werkudara' },
      { name: 'Treadmill', mandatory: false, supportBy: 'werkudara' },
      { name: 'Olahraga Sendiri', mandatory: false, supportBy: 'personal' },
    ],
  },
  {
    id: 'emotional',
    name: 'Emotional Wellbeing',
    icon: Heart,
    color: 'rose',
    activities: [
      { name: 'Konsultasi / Konseling / Sharing Session Mental Health', mandatory: false, supportBy: 'werkudara' },
      { name: 'Penyaluran Hobi / Minat dengan Aktivitas Sosial', mandatory: false, supportBy: 'personal' },
    ],
  },
  {
    id: 'social',
    name: 'Social Wellbeing',
    icon: Users,
    color: 'sky',
    activities: [
      { name: 'Team Building / Gathering / WAM / Mid-Year Recharge', mandatory: true, supportBy: 'werkudara' },
      { name: 'Kegiatan Sosial Luar Kantor (CSR, Bakti Sosial, Arisan)', mandatory: false, supportBy: 'personal' },
      { name: 'CSR', mandatory: true, supportBy: 'werkudara' },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Wellbeing',
    icon: Wallet,
    color: 'emerald',
    activities: [
      { name: 'Program Tabungan atau Benefit Financial', mandatory: false, supportBy: 'personal' },
      { name: 'Seminar Pengelolaan Keuangan dan Investasi', mandatory: true, supportBy: 'werkudara' },
    ],
  },
  {
    id: 'spiritual',
    name: 'Spiritual Wellbeing',
    icon: Sparkles,
    color: 'amber',
    activities: [
      { name: 'Ibadah Tidak Wajib', mandatory: false, supportBy: 'personal' },
    ],
  },
] as const

type Step = 'dimension' | 'activity' | 'details'

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
}

interface WellbeingActivityFormProps {
  isOpen: boolean
  onClose: () => void
}

export default function WellbeingActivityForm({ isOpen, onClose }: WellbeingActivityFormProps) {
  const [step, setStep] = useState<Step>('dimension')
  const [selectedDimension, setSelectedDimension] = useState<typeof WELLBEING_DIMENSIONS[number] | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<string>('')
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [dimensionDbId, setDimensionDbId] = useState<string | null>(null)

  const router = useRouter()
  const { success, error: toastError } = useToast()

  // Fetch dimension DB ID when dimension is selected
  useEffect(() => {
    if (!selectedDimension) return
    const fetchDimensionId = async () => {
      try {
        const res = await fetch('/api/dimensions')
        const data = await res.json()
        const dim = data?.dimensions?.find((d: { name: string }) =>
          d.name.toLowerCase() === selectedDimension.id.toLowerCase()
        )
        if (dim) setDimensionDbId(dim.id)
      } catch {
        // fallback: will use null
      }
    }
    fetchDimensionId()
  }, [selectedDimension])

  const resetForm = () => {
    setStep('dimension')
    setSelectedDimension(null)
    setSelectedActivity('')
    setDescription('')
    setProofFile(null)
    setDate(new Date().toISOString().split('T')[0])
    setDuration('')
    setDimensionDbId(null)
  }

  const handleClose = () => {
    onClose()
    setTimeout(resetForm, 300)
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

  const handleSubmit = async () => {
    if (!selectedDimension || !selectedActivity || !proofFile) return

    setLoading(true)
    try {
      const proofUrl = await uploadProof(proofFile)

      const res = await fetch('/api/activities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sport',
          steps: 0,
          distance: 0,
          calories: 0,
          date,
          type: selectedActivity,
          proof_url: proofUrl,
          moving_time: duration ? Number(duration) * 60 : 0,
          dimension_id: dimensionDbId,
          description,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kegiatan')

      success('Kegiatan berhasil disubmit! Menunggu review HR.')
      handleClose()
      router.refresh()
      window.location.reload()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan kegiatan'
      console.error(e)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const colors = selectedDimension ? colorMap[selectedDimension.color] : null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#111111] border-t border-white/[0.08] rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              {['dimension', 'activity', 'details'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'bg-[#FC4C02] text-white' :
                    ['dimension', 'activity', 'details'].indexOf(step) > i ? 'bg-green-500/20 text-green-400' :
                    'bg-white/5 text-gray-600'
                  }`}>
                    {['dimension', 'activity', 'details'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-white/10" />}
                </div>
              ))}
              <span className="text-xs text-gray-500 ml-2">
                {step === 'dimension' ? 'Pilih Dimensi' : step === 'activity' ? 'Pilih Kegiatan' : 'Detail & Bukti'}
              </span>
            </div>

            {/* Step 1: Choose Dimension */}
            {step === 'dimension' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <h3 className="text-lg font-bold text-white mb-4">Pilih Dimensi Wellbeing</h3>
                {WELLBEING_DIMENSIONS.map((dim) => {
                  const Icon = dim.icon
                  const c = colorMap[dim.color]
                  return (
                    <button
                      key={dim.id}
                      onClick={() => {
                        setSelectedDimension(dim)
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

            {/* Step 2: Choose Activity */}
            {step === 'activity' && selectedDimension && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
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
                      setSelectedActivity(act.name)
                      setStep('details')
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-[0.98] transition-all text-left`}
                  >
                    <div className="flex-1">
                      <span className="text-white font-medium block">{act.name}</span>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${act.mandatory ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {act.mandatory ? 'Wajib' : 'Tidak Wajib'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${act.supportBy === 'werkudara' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {act.supportBy === 'werkudara' ? 'Werkudara' : 'Personal'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Step 3: Details & Proof */}
            {step === 'details' && selectedDimension && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setStep('activity')}
                  className="text-sm text-gray-500 hover:text-white mb-2 transition-colors"
                >
                  ← Kembali
                </button>

                <div className={`p-3 rounded-xl ${colors?.bg} ${colors?.border} border`}>
                  <p className={`text-xs ${colors?.text} font-medium`}>{selectedDimension.name}</p>
                  <p className="text-white font-bold text-sm mt-0.5">{selectedActivity}</p>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Tanggal Pelaksanaan
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

                {/* Duration (optional) */}
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

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Deskripsi Kegiatan
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 text-gray-500 w-4 h-4" />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan kegiatan yang dilakukan..."
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
                    <span className="truncate">{proofFile ? proofFile.name : 'Upload foto bukti kegiatan'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {proofFile && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                      <img
                        src={URL.createObjectURL(proofFile)}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-400">
                    Kegiatan akan di-review oleh HR sebelum poin diberikan. Pastikan foto dokumentasi jelas dan deskripsi lengkap.
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !proofFile}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WellbeingActivityForm.tsx
git commit -m "feat: add multi-dimension wellbeing activity form for downgrade mode"
```

---

### Task 7: Integrate WellbeingActivityForm into AddActivityBtn

**Files:**
- Modify: `src/components/AddActivityBtn.tsx`

- [ ] **Step 1: Add downgrade mode toggle**

At the top of the file, add imports:
```ts
import { isDowngradeModeClient } from '@/lib/downgrade'
import WellbeingActivityForm from '@/components/WellbeingActivityForm'
```

- [ ] **Step 2: Modify the component to swap forms**

Inside the `AddActivityBtn` component, after the existing `const [isOpen, setIsOpen] = useState(false)` line, the render should conditionally show the new form. 

Find the return statement starting with:
```tsx
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
```

Replace the entire return block with:
```tsx
    const downgradeMode = isDowngradeModeClient()

    if (downgradeMode) {
        return (
            <>
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 right-5 bg-[#FC4C02] text-white p-3.5 rounded-2xl shadow-lg shadow-[#FC4C02]/20 z-40 hover:scale-105 active:scale-95 transition-transform"
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
```

> **Note:** The closing of the original return block stays as-is. We're just adding a conditional early return for downgrade mode.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddActivityBtn.tsx
git commit -m "feat: swap to wellbeing form in downgrade mode, keep original form for normal mode"
```

---

## Chunk 3: Admin Review Queue for HR

### Task 8: Create Admin Activity Review API

**Files:**
- Create: `src/app/api/admin/activities/review/route.ts`

This API allows HR to:
1. GET pending activities for review
2. PATCH to approve/reject with manual point assignment

- [ ] **Step 1: Create the review API route**

```ts
// src/app/api/admin/activities/review/route.ts
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAuthProfileContext } from '@/utils/auth'
import { NextResponse } from 'next/server'

// GET: Fetch all pending activities for HR review
export async function GET() {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Check if user is admin
    const { data: participant } = await supabase
      .from('participants')
      .select('is_admin')
      .eq('id', context.profileId)
      .maybeSingle()

    if (!participant?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch pending activities with user info
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        user_id,
        name,
        type,
        start_date,
        calories,
        distance,
        moving_time,
        activity_points,
        review_status,
        review_reason,
        proof_url,
        source,
        dimension_id,
        created_at,
        mode
      `)
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch pending activities:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    // Fetch user profiles for display
    const userIds = [...new Set((activities || []).map(a => a.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    // Fetch dimensions for display
    const { data: dimensions } = await supabase
      .from('dimensions')
      .select('id, name, display_name')

    const dimensionMap = new Map((dimensions || []).map(d => [d.id, d]))

    const enriched = (activities || []).map(a => ({
      ...a,
      user: profileMap.get(a.user_id) || { full_name: 'Unknown', avatar_url: null },
      dimension: a.dimension_id ? dimensionMap.get(a.dimension_id) || null : null,
    }))

    return NextResponse.json({ activities: enriched })
  } catch (error) {
    console.error('Review GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH: Approve or reject an activity with manual point assignment
export async function PATCH(request: Request) {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Check admin
    const { data: participant } = await supabase
      .from('participants')
      .select('is_admin')
      .eq('id', context.profileId)
      .maybeSingle()

    if (!participant?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { activity_id, action, points, reason } = body as {
      activity_id: string | number
      action: 'approve' | 'reject'
      points?: number
      reason?: string
    }

    if (!activity_id || !action) {
      return NextResponse.json({ error: 'activity_id and action are required' }, { status: 400 })
    }

    if (action === 'approve' && (points === undefined || points === null)) {
      return NextResponse.json({ error: 'Points are required for approval' }, { status: 400 })
    }

    // Update activity
    const updateData: Record<string, unknown> = {
      review_status: action === 'approve' ? 'approved' : 'rejected',
      review_reason: reason || null,
    }

    if (action === 'approve') {
      updateData.activity_points = Math.max(0, Math.floor(Number(points)))
    }

    const { error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activity_id)

    if (updateError) {
      console.error('Failed to update activity:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // If approved, also create a point_adjustment for tracking
    if (action === 'approve' && points && points > 0) {
      // Fetch the activity to get user_id
      const { data: activity } = await supabase
        .from('activities')
        .select('user_id, name, dimension_id')
        .eq('id', activity_id)
        .maybeSingle()

      if (activity) {
        await supabase.from('point_adjustments').insert({
          participant_id: activity.user_id,
          points: Math.max(0, Math.floor(Number(points))),
          reason: `HR Approved: ${activity.name}${reason ? ` — ${reason}` : ''}`,
        })

        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: activity.user_id,
          title: 'Kegiatan Disetujui',
          body: `Kegiatan "${activity.name}" telah disetujui. Kamu mendapat ${points} poin!`,
          type: 'point_award',
        }).catch(() => {}) // non-critical
      }
    }

    if (action === 'reject') {
      const { data: activity } = await supabase
        .from('activities')
        .select('user_id, name')
        .eq('id', activity_id)
        .maybeSingle()

      if (activity) {
        await supabase.from('notifications').insert({
          user_id: activity.user_id,
          title: 'Kegiatan Ditolak',
          body: `Kegiatan "${activity.name}" ditolak.${reason ? ` Alasan: ${reason}` : ''}`,
          type: 'system',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/activities/review/route.ts
git commit -m "feat: add admin activity review API for HR manual point assignment"
```

---

### Task 9: Add Review Queue Tab to Admin Panel

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

> **Note:** This task requires reading the full admin page first to understand the existing tab structure. The implementation adds a new "Review Queue" tab that shows pending activities with approve/reject + point input controls.

- [ ] **Step 1: Read the admin page to understand tab structure**

Read `src/app/dashboard/admin/page.tsx` to identify:
- How tabs are defined (likely an array or enum)
- Where tab content is rendered
- The existing pattern for data fetching and actions

- [ ] **Step 2: Add the Review Queue tab definition**

Add `'review'` to the existing tabs array/type. Follow the existing pattern.

- [ ] **Step 3: Add Review Queue state and data fetching**

Add state for:
```ts
const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([])
const [reviewLoading, setReviewLoading] = useState(false)
const [pointInputs, setPointInputs] = useState<Record<string, string>>({})
const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})
```

Add fetch function:
```ts
const fetchPendingActivities = async () => {
  setReviewLoading(true)
  try {
    const res = await fetch('/api/admin/activities/review')
    const data = await res.json()
    setPendingActivities(data.activities || [])
  } catch (e) {
    console.error(e)
  } finally {
    setReviewLoading(false)
  }
}
```

- [ ] **Step 4: Add approve/reject handlers**

```ts
const handleApprove = async (activityId: string | number) => {
  const points = Number(pointInputs[String(activityId)] || 0)
  if (points <= 0) {
    toastError('Masukkan jumlah poin')
    return
  }
  try {
    const res = await fetch('/api/admin/activities/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: activityId, action: 'approve', points }),
    })
    if (!res.ok) throw new Error('Failed')
    success('Kegiatan disetujui')
    fetchPendingActivities()
  } catch {
    toastError('Gagal menyetujui')
  }
}

const handleReject = async (activityId: string | number) => {
  const reason = rejectReasons[String(activityId)] || ''
  try {
    const res = await fetch('/api/admin/activities/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: activityId, action: 'reject', reason }),
    })
    if (!res.ok) throw new Error('Failed')
    success('Kegiatan ditolak')
    fetchPendingActivities()
  } catch {
    toastError('Gagal menolak')
  }
}
```

- [ ] **Step 5: Add Review Queue tab content UI**

The review queue tab should render:
- A count badge showing pending items
- For each pending activity:
  - User name + avatar
  - Dimension badge (color-coded)
  - Activity name/type
  - Date
  - Photo proof (clickable to enlarge)
  - Description
  - Duration if available
  - Point input field (number)
  - Approve button (green)
  - Reject button (red) with optional reason
- Empty state when no pending activities

Follow the existing admin panel styling patterns.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/admin/page.tsx
git commit -m "feat: add review queue tab to admin panel for HR manual activity review"
```

---

## Chunk 4: Hide Strava UI in Downgrade Mode

### Task 10: Hide Strava Integration Page

**Files:**
- Modify: `src/app/dashboard/integrations/page.tsx`

- [ ] **Step 1: Add downgrade mode check**

At the top, add:
```ts
import { isDowngradeModeClient } from '@/lib/downgrade'
```

At the beginning of the component, add:
```ts
const downgradeMode = isDowngradeModeClient()
```

- [ ] **Step 2: Show disabled message in downgrade mode**

Wrap the main content. After the back button, add:
```tsx
{downgradeMode ? (
  <div className="max-w-2xl mx-auto text-center py-20">
    <div className="p-4 bg-gray-800/50 rounded-2xl inline-block mb-4">
      <Smartphone className="w-12 h-12 text-gray-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-400 mb-2">Integrasi Tidak Tersedia</h2>
    <p className="text-gray-600">Fitur integrasi Strava sedang dalam maintenance. Silakan input kegiatan secara manual.</p>
  </div>
) : (
  // ... existing content
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/integrations/page.tsx
git commit -m "feat: hide Strava integration UI in downgrade mode"
```

---

### Task 11: Hide Strava Link on Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add downgrade import**

Add at the top:
```ts
import { isDowngradeModeClient } from '@/lib/downgrade'
```

- [ ] **Step 2: Conditionally hide Strava-related UI elements**

Find any Strava connect/sync buttons or links on the dashboard and wrap them with:
```tsx
{!isDowngradeModeClient() && (
  // ... Strava UI
)}
```

This needs to be done after reading the full dashboard page to identify all Strava references.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: hide Strava UI elements on dashboard in downgrade mode"
```

---

## Chunk 5: Verification & Testing

### Task 12: Manual Verification Checklist

- [ ] **Step 1: Verify downgrade mode activates**

Set `NEXT_PUBLIC_DOWNGRADE_MODE=true` in `.env.local` and restart dev server.

Run: `npm run dev`

- [ ] **Step 2: Test activity submission flow**

1. Open dashboard
2. Click + button → should show WellbeingActivityForm (not original form)
3. Select dimension → select activity → fill details → upload photo → submit
4. Verify activity is saved with `review_status: 'pending'` and `activity_points: 0`

- [ ] **Step 3: Test admin review queue**

1. Login as admin
2. Go to admin panel → Review Queue tab
3. See pending activity
4. Input points manually → click Approve
5. Verify activity updated to `approved` with manual points
6. Verify point_adjustment created
7. Verify notification sent to user

- [ ] **Step 4: Test Strava is disabled**

1. Go to /dashboard/integrations → should show disabled message
2. Verify Strava sync API returns early without syncing

- [ ] **Step 5: Test QR attendance still works**

1. Scan QR for badminton/internal activity
2. Verify attendance is recorded
3. Verify points are awarded (QR system is NOT downgraded)

- [ ] **Step 6: Test revert**

1. Set `NEXT_PUBLIC_DOWNGRADE_MODE=false` in `.env.local`
2. Restart dev server
3. Verify original AddActivityBtn form appears
4. Verify Strava integration page works
5. Verify auto-point calculation works
6. Verify quest generation works

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: complete wellbeing downgrade mode — form-based submission with HR manual review"
```

---

## Summary

### What's Downgraded (Code-Level Only):
1. **Auto-point calculation** → Activities land with 0 points, status `pending`
2. **Strava sync** → Short-circuited, returns empty
3. **Quest auto-generation** → Skipped entirely
4. **Activity form** → Replaced with multi-dimension wellbeing form (Dimensi → Kegiatan → Foto + Deskripsi)

### What's Added for HR:
1. **Review Queue** in admin panel — see all pending activities
2. **Manual point input** — HR decides how many points each activity gets
3. **Approve/Reject** with notifications to users
4. **Photo proof review** — HR must check documentation

### What Stays Active:
1. **QR attendance** for badminton & internal activities
2. **Leaderboard** (but points only come from HR-approved activities + QR)
3. **Dashboard** display
4. **All database tables** — completely untouched

### How to Revert (2 months later):
1. Set `NEXT_PUBLIC_DOWNGRADE_MODE=false` in `.env.local`
2. Restart the app
3. Everything returns to normal automatically
