'use client'

import { useRef, useState } from 'react'
import {
    AlertTriangle, CheckCircle2, FileUp, Loader2, RotateCcw, Upload,
} from 'lucide-react'

import { useToast } from '@/context/ToastContext'

// ---------------------------------------------------------------------------
// Types mirror /api/admin/imports/user-summary response
// ---------------------------------------------------------------------------

type PreviewRow = {
    line: number
    user_id: string | null
    username: string
    matched: boolean
    full_name: string | null
    current_points: number
    new_points: number | null
    points_delta: number
    current_coins: number
    new_coins: number | null
    coins_delta: number
    note: string | null
}

type PreviewSummary = {
    total: number
    matched: number
    unmatched: number
    points_changes: number
    coins_changes: number
}

type ApplyResult = {
    ok: boolean
    applied_at: string
    tag: string
    counts: {
        points_applied: number
        coins_applied: number
        unmatched: number
    }
    errors: string[]
}

const ENDPOINT = '/api/admin/imports/user-summary'

function formatDelta(value: number): string {
    if (value === 0) return '0'
    const sign = value > 0 ? '+' : '−'
    return `${sign}${Math.abs(value).toLocaleString('id-ID')}`
}

function formatNumber(value: number | null): string {
    if (value === null || value === undefined) return '—'
    return value.toLocaleString('id-ID')
}

export function ImportTab() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<PreviewRow[] | null>(null)
    const [summary, setSummary] = useState<PreviewSummary | null>(null)
    const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
    const [loadingPhase, setLoadingPhase] = useState<'idle' | 'preview' | 'apply'>('idle')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { success, error: toastError } = useToast()

    const reset = () => {
        setFile(null)
        setPreview(null)
        setSummary(null)
        setApplyResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const submit = async (action: 'preview' | 'apply') => {
        if (!file) {
            toastError('Pilih file CSV dulu')
            return
        }
        setLoadingPhase(action)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('action', action)

            const res = await fetch(ENDPOINT, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)

            if (action === 'preview') {
                setPreview(data.preview as PreviewRow[])
                setSummary(data.summary as PreviewSummary)
                setApplyResult(null)
            } else {
                setApplyResult(data as ApplyResult)
                if ((data as ApplyResult).ok) {
                    success('Import berhasil diapply')
                } else {
                    toastError('Import selesai dengan error')
                }
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Gagal memproses CSV'
            console.error('Import failed:', e)
            toastError(message)
        } finally {
            setLoadingPhase('idle')
        }
    }

    const matchedRows = (preview ?? []).filter((p) => p.matched)
    const unmatchedRows = (preview ?? []).filter((p) => !p.matched)
    const flaggedRows = matchedRows.filter((p) => p.note)
    const hasChanges =
        (summary?.points_changes ?? 0) > 0 || (summary?.coins_changes ?? 0) > 0

    return (
        <div className="space-y-5">
            {/* Header guidance */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#FC4C02]/10 p-2">
                        <FileUp className="h-5 w-5 text-[#FC4C02]" />
                    </div>
                    <div className="flex-1 text-xs text-gray-400">
                        <p className="text-sm font-semibold text-white">Bulk Import — Mode OVERRIDE</p>
                        <p className="mt-1 leading-relaxed">
                            Upload CSV dengan kolom{' '}
                            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">user_id</code>{' '}
                            atau{' '}
                            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">username</code>,{' '}
                            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">total_points</code>, dan{' '}
                            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">coins</code>.
                            Sistem akan menghitung delta dari nilai sekarang ke target di CSV, lalu
                            insert <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">point_adjustments</code> dan{' '}
                            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-gray-200">coin_transactions</code> sebesar delta.
                            Format CSV identik dengan output Export Ringkasan User.
                        </p>
                    </div>
                </div>
            </div>

            {/* File picker */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-8 text-center transition-colors hover:border-[#FC4C02]/40 hover:bg-[#FC4C02]/[0.04]">
                    <Upload className="h-6 w-6 text-gray-500" />
                    <p className="text-sm font-semibold text-white">
                        {file ? file.name : 'Pilih file CSV'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                        {file
                            ? `${(file.size / 1024).toFixed(1)} KB · klik untuk ganti`
                            : 'Drag & drop atau klik untuk browse'}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            setFile(f ?? null)
                            setPreview(null)
                            setSummary(null)
                            setApplyResult(null)
                        }}
                    />
                </label>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {(preview || file) && (
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-gray-300 transition-all hover:border-white/[0.12] hover:text-white"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => submit('preview')}
                        disabled={!file || loadingPhase !== 'idle'}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loadingPhase === 'preview' ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>Preview</>
                        )}
                    </button>
                </div>
            </div>

            {/* Preview summary + table */}
            {summary && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[
                            { label: 'Total baris', value: summary.total, accent: 'text-white' },
                            { label: 'Match', value: summary.matched, accent: 'text-emerald-400' },
                            { label: 'Tidak match', value: summary.unmatched, accent: 'text-rose-400' },
                            { label: 'Δ Points', value: summary.points_changes, accent: 'text-[#FC4C02]' },
                            { label: 'Δ Coins', value: summary.coins_changes, accent: 'text-amber-400' },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                            >
                                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                                    {stat.label}
                                </p>
                                <p className={`mt-0.5 font-mono text-base font-black ${stat.accent}`}>
                                    {stat.value.toLocaleString('id-ID')}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Warning banner */}
                    {(unmatchedRows.length > 0 || flaggedRows.length > 0) && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <div>
                                {unmatchedRows.length > 0 && (
                                    <p>
                                        {unmatchedRows.length} baris tidak match dengan user manapun dan
                                        akan di-skip saat apply.
                                    </p>
                                )}
                                {flaggedRows.length > 0 && (
                                    <p>
                                        {flaggedRows.length} baris punya nilai negatif dan akan di-skip
                                        saat apply.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preview table */}
                    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full min-w-[820px] text-xs">
                            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-3 py-2 text-left">#</th>
                                    <th className="px-3 py-2 text-left">User</th>
                                    <th className="px-3 py-2 text-right">Curr Pts</th>
                                    <th className="px-3 py-2 text-right">New Pts</th>
                                    <th className="px-3 py-2 text-right">Δ Pts</th>
                                    <th className="px-3 py-2 text-right">Curr Coins</th>
                                    <th className="px-3 py-2 text-right">New Coins</th>
                                    <th className="px-3 py-2 text-right">Δ Coins</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04] text-gray-300">
                                {(preview ?? []).map((row) => (
                                    <tr
                                        key={row.line}
                                        className={
                                            row.matched
                                                ? row.note
                                                    ? 'bg-amber-500/5'
                                                    : ''
                                                : 'bg-rose-500/5'
                                        }
                                    >
                                        <td className="px-3 py-2 text-gray-500">{row.line}</td>
                                        <td className="px-3 py-2">
                                            <p className="font-semibold text-white">
                                                {row.full_name || row.username || '—'}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {row.username
                                                    ? `@${row.username}`
                                                    : row.user_id
                                                        ? `id ${row.user_id}`
                                                        : '—'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {formatNumber(row.current_points)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {formatNumber(row.new_points)}
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right font-mono ${
                                                row.points_delta > 0
                                                    ? 'text-emerald-400'
                                                    : row.points_delta < 0
                                                        ? 'text-rose-400'
                                                        : 'text-gray-600'
                                            }`}
                                        >
                                            {formatDelta(row.points_delta)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {formatNumber(row.current_coins)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {formatNumber(row.new_coins)}
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right font-mono ${
                                                row.coins_delta > 0
                                                    ? 'text-emerald-400'
                                                    : row.coins_delta < 0
                                                        ? 'text-rose-400'
                                                        : 'text-gray-600'
                                            }`}
                                        >
                                            {formatDelta(row.coins_delta)}
                                        </td>
                                        <td className="px-3 py-2 text-[11px]">
                                            {row.matched ? (
                                                row.note ? (
                                                    <span className="text-amber-400">{row.note}</span>
                                                ) : (
                                                    <span className="text-emerald-400">OK</span>
                                                )
                                            ) : (
                                                <span className="text-rose-400">{row.note ?? 'Tidak match'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Apply button */}
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => submit('apply')}
                            disabled={!hasChanges || loadingPhase !== 'idle' || !!applyResult}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#FC4C02] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FC4C02]/20 transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                        >
                            {loadingPhase === 'apply' ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Mengaplikasikan...
                                </>
                            ) : (
                                <>
                                    <Upload size={14} />
                                    Apply ke Database
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Apply result */}
            {applyResult && (
                <div
                    className={`rounded-2xl border p-4 ${
                        applyResult.ok
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-rose-500/30 bg-rose-500/10'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        {applyResult.ok ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-400" />
                        )}
                        <div className="flex-1 text-xs">
                            <p
                                className={`text-sm font-bold ${
                                    applyResult.ok ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {applyResult.ok ? 'Import berhasil' : 'Import gagal sebagian'}
                            </p>
                            <p className="mt-1 text-gray-300">
                                {applyResult.counts.points_applied} point adjustments,{' '}
                                {applyResult.counts.coins_applied} coin transactions diinsert.
                                {applyResult.counts.unmatched > 0 && (
                                    <> {applyResult.counts.unmatched} baris di-skip karena tidak match.</>
                                )}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">Tag: {applyResult.tag}</p>
                            {applyResult.errors.length > 0 && (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-rose-300">
                                    {applyResult.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
