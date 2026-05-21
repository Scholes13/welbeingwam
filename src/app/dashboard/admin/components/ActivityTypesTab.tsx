'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { fetchJson } from '@/lib/fetch-json'

type ActivityTypeRow = {
  id: string
  code: string
  name: string
  mode: 'daily' | 'sport'
  dimension_id: string | null
  points: number
  requires_steps: boolean
  requires_calories: boolean
  is_active: boolean
  sort_order: number
  dimension?: { id: string; name: string; display_name: string } | null
}

type DraftMap = Record<string, { name?: string; points?: number; is_active?: boolean }>

const MODE_LABEL: Record<ActivityTypeRow['mode'], string> = {
  daily: 'Daily Activity',
  sport: 'Sport Session',
}

export function ActivityTypesTab() {
  const { success, error: toastError } = useToast()
  const [rows, setRows] = useState<ActivityTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchJson<{ types?: ActivityTypeRow[] }>('/api/admin/activity-types')
      setRows(data.types || [])
    } catch (e) {
      console.error(e)
      toastError('Gagal memuat daftar kegiatan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateDraft = (id: string, patch: Partial<DraftMap[string]>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  const isDirty = (id: string) => {
    const draft = drafts[id]
    if (!draft) return false
    return Object.keys(draft).length > 0
  }

  const cancelDraft = (id: string) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const saveRow = async (row: ActivityTypeRow) => {
    const draft = drafts[row.id]
    if (!draft) return

    setSavingId(row.id)
    try {
      const res = await fetch('/api/admin/activity-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, ...draft }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Gagal menyimpan')

      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...body.type } : r)))
      cancelDraft(row.id)
      success(`${row.name} tersimpan`)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan'
      toastError(message)
    } finally {
      setSavingId(null)
    }
  }

  const toggleActive = async (row: ActivityTypeRow) => {
    setSavingId(row.id)
    try {
      const res = await fetch('/api/admin/activity-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Gagal mengubah status')

      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...body.type } : r)))
      success(`${row.name} ${body.type.is_active ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal mengubah status'
      toastError(message)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat catalog kegiatan...
      </div>
    )
  }

  // Group by mode → dimension
  type GroupKey = string
  const groups = new Map<GroupKey, { title: string; subtitle?: string; items: ActivityTypeRow[] }>()
  for (const row of rows) {
    const dimensionLabel = row.dimension?.display_name || (row.mode === 'sport' ? 'Sport (calories-based)' : 'Tanpa Dimensi')
    const key = `${row.mode}::${dimensionLabel}`
    if (!groups.has(key)) {
      groups.set(key, {
        title: dimensionLabel,
        subtitle: MODE_LABEL[row.mode],
        items: [],
      })
    }
    groups.get(key)!.items.push(row)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
        <p>
          Kelola jenis kegiatan yang muncul di tombol <span className="font-bold text-white">Add Activity</span>.
          Edit nama, ubah poin yang diberikan, atau nonaktifkan kegiatan tanpa menghapusnya.
        </p>
        <p className="mt-2 text-[12px] text-gray-500">
          Catatan: <span className="text-white">Steps</span> tidak memakai poin tetap — poin dihitung dari jumlah langkah.
          Sport <span className="text-white">requires_calories</span> memakai konversi 1 kalori = 1 poin.
        </p>
      </div>

      {Array.from(groups.entries()).map(([key, group]) => (
        <div key={key} className="rounded-2xl border border-white/10 bg-[#121212]">
          <div className="border-b border-white/10 px-5 py-3">
            <h3 className="text-sm font-bold text-white">{group.title}</h3>
            {group.subtitle && <p className="text-[11px] uppercase tracking-wider text-gray-500">{group.subtitle}</p>}
          </div>

          <div className="divide-y divide-white/5">
            {group.items.map((row) => {
              const draft = drafts[row.id] || {}
              const nameValue = draft.name ?? row.name
              const pointsValue = draft.points ?? row.points
              const isLocked = row.requires_steps || row.requires_calories
              const dirty = isDirty(row.id)
              const isSaving = savingId === row.id

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr,140px,160px,auto] md:items-center ${
                    !row.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => updateDraft(row.id, { name: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#FC4C02]/40 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-600">
                      <code className="rounded bg-white/5 px-1.5 py-0.5">{row.code}</code>
                      {isLocked && (
                        <span className="ml-2 text-amber-400">
                          {row.requires_steps ? '· Steps-based' : '· Calories-based'}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500">Poin</label>
                    <input
                      type="number"
                      value={isLocked ? 0 : pointsValue}
                      disabled={isLocked}
                      min={0}
                      max={10000}
                      onChange={(e) => updateDraft(row.id, { points: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#FC4C02]/40 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500">Status</label>
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      disabled={isSaving}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                        row.is_active
                          ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {row.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <div className="flex justify-end gap-2">
                    {dirty && (
                      <button
                        type="button"
                        onClick={() => cancelDraft(row.id)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-400 hover:bg-white/5"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={!dirty || isSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FC4C02] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
