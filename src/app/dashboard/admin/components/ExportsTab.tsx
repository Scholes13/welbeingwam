'use client'

import { useState } from 'react'
import { ChevronDown, Database, Download, Loader2, Sparkles } from 'lucide-react'

import { useToast } from '@/context/ToastContext'

type DatasetKey =
    | 'user-summary'
    | 'leaderboard'
    | 'users'
    | 'activities'
    | 'point-adjustments'
    | 'coin-transactions'

type DatasetMeta = {
    key: DatasetKey
    label: string
    description: string
    rowsHint: string
}

const PRIMARY: DatasetMeta = {
    key: 'user-summary',
    label: 'Ringkasan User',
    description:
        'Satu file berisi rank, nama, total points, breakdown step / sport / quest, dan saldo coin per user. Cocok untuk laporan ke manajemen.',
    rowsHint: '1 baris per user',
}

const SECONDARY: DatasetMeta[] = [
    {
        key: 'leaderboard',
        label: 'Leaderboard Detail',
        description:
            'Sama seperti Ringkasan User tapi tanpa coins, ditambah breakdown per dimensi (physical, emotional, social, financial, spiritual).',
        rowsHint: '1 baris per user',
    },
    {
        key: 'users',
        label: 'Profil User',
        description:
            'Daftar profil user beserta status admin, sumber avatar, dan timestamp Strava sync terakhir.',
        rowsHint: '1 baris per akun',
    },
    {
        key: 'activities',
        label: 'Audit Activities',
        description:
            'Audit lengkap semua aktivitas (daily, sport, event) termasuk steps, kalori, point, status review, dan source. Limit 50.000 baris terbaru.',
        rowsHint: 'Hingga 50k baris',
    },
    {
        key: 'point-adjustments',
        label: 'Point Adjustments',
        description:
            'Bonus / penalty manual yang diberikan admin kepada user (HR Assigned, koreksi, dsb).',
        rowsHint: 'Hingga 50k baris',
    },
    {
        key: 'coin-transactions',
        label: 'Coin Transactions',
        description:
            'Histori perubahan saldo coin (top-up, redeem, COIN RESET) berikut admin yang menjalankan aksi.',
        rowsHint: 'Hingga 50k baris',
    },
]

export function ExportsTab() {
    const [loadingKey, setLoadingKey] = useState<DatasetKey | null>(null)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const { success, error: toastError } = useToast()

    const handleDownload = async (dataset: DatasetMeta) => {
        setLoadingKey(dataset.key)
        try {
            const res = await fetch(`/api/admin/exports/${dataset.key}`, {
                credentials: 'same-origin',
            })

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}))
                throw new Error(payload?.error || `HTTP ${res.status}`)
            }

            const blob = await res.blob()
            const dispoHeader = res.headers.get('Content-Disposition') || ''
            const filenameMatch = dispoHeader.match(/filename="?([^";]+)"?/i)
            const filename = filenameMatch?.[1] || `${dataset.key}.csv`

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)

            success(`${dataset.label} exported`)
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Gagal mengunduh export'
            console.error('Export download failed:', e)
            toastError(message)
        } finally {
            setLoadingKey(null)
        }
    }

    const isAnyLoading = loadingKey !== null

    return (
        <div className="space-y-5">
            {/* ── Primary card: User Summary ── */}
            <div className="relative overflow-hidden rounded-3xl border border-[#FC4C02]/30 bg-gradient-to-br from-[#FC4C02]/15 via-orange-500/5 to-transparent p-6">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FC4C02]/15 blur-3xl" />

                <div className="relative">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-[#FC4C02]/20 p-3 ring-1 ring-inset ring-[#FC4C02]/30">
                                <Sparkles className="h-6 w-6 text-[#FC4C02]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FC4C02]">
                                    Recommended
                                </p>
                                <h3 className="mt-0.5 text-xl font-bold text-white">{PRIMARY.label}</h3>
                                <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">
                                    {PRIMARY.rowsHint}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="mb-5 text-sm leading-relaxed text-gray-300">
                        {PRIMARY.description}
                    </p>

                    <div className="mb-5 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                        {[
                            { label: 'Rank', sub: 'Peringkat user' },
                            { label: 'Total Points', sub: 'Step + Sport + Quest' },
                            { label: 'Coins', sub: 'Saldo coin saat ini' },
                            { label: 'Breakdown', sub: 'Step / Sport / Quest' },
                        ].map((col) => (
                            <div
                                key={col.label}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                            >
                                <p className="font-semibold text-white">{col.label}</p>
                                <p className="mt-0.5 text-gray-500">{col.sub}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleDownload(PRIMARY)}
                        disabled={isAnyLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FC4C02] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FC4C02]/30 transition-all hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto"
                    >
                        {loadingKey === PRIMARY.key ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Mengunduh...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Download Ringkasan User (CSV)
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Advanced exports toggle ── */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-gray-500" />
                        <div>
                            <p className="text-sm font-semibold text-white">Export Lain (Lanjutan)</p>
                            <p className="text-xs text-gray-500">
                                Audit, breakdown dimensi, dan histori transaksi.
                            </p>
                        </div>
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                </button>

                {showAdvanced && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {SECONDARY.map((dataset) => {
                            const isLoading = loadingKey === dataset.key
                            return (
                                <div
                                    key={dataset.key}
                                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-white">{dataset.label}</p>
                                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">
                                            {dataset.rowsHint}
                                        </p>
                                    </div>
                                    <p className="flex-1 text-xs leading-relaxed text-gray-400">
                                        {dataset.description}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(dataset)}
                                        disabled={isAnyLoading}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-200 transition-all hover:border-[#FC4C02]/40 hover:bg-[#FC4C02]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Mengunduh...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={14} />
                                                Download CSV
                                            </>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
