'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

import { useToast } from '@/context/ToastContext'

type DatasetKey =
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

const DATASETS: DatasetMeta[] = [
    {
        key: 'leaderboard',
        label: 'Leaderboard',
        description:
            'Snapshot peringkat user lengkap dengan step points, sport points, quest points, total, dan breakdown per dimensi.',
        rowsHint: '1 baris per user aktif',
    },
    {
        key: 'users',
        label: 'Users',
        description:
            'Daftar profil user beserta status admin, sumber avatar, dan timestamp Strava sync terakhir.',
        rowsHint: '1 baris per akun',
    },
    {
        key: 'activities',
        label: 'Activities',
        description:
            'Audit lengkap aktivitas (daily, sport, event) termasuk steps, kalori, point, status review, dan source. Limit 50.000 baris terbaru.',
        rowsHint: 'Hingga 50k baris terbaru',
    },
    {
        key: 'point-adjustments',
        label: 'Point Adjustments',
        description:
            'Bonus / penalty manual yang diberikan admin kepada user (HR Assigned, koreksi, dsb).',
        rowsHint: 'Hingga 50k baris terbaru',
    },
    {
        key: 'coin-transactions',
        label: 'Coin Transactions',
        description:
            'Histori perubahan saldo coin (top-up, redeem, COIN RESET) berikut admin yang menjalankan aksi.',
        rowsHint: 'Hingga 50k baris terbaru',
    },
]

export function ExportsTab() {
    const [loadingKey, setLoadingKey] = useState<DatasetKey | null>(null)
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

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#FC4C02]/10 p-2">
                        <FileSpreadsheet className="h-5 w-5 text-[#FC4C02]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Backup data dalam format CSV</p>
                        <p className="mt-1 text-xs text-gray-400">
                            File CSV bisa langsung dibuka di Excel, Google Sheets, atau diimpor ke
                            tools BI lain. Setiap export digenerate on-demand dari snapshot data
                            saat ini, bukan dari cache.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {DATASETS.map((dataset) => {
                    const isLoading = loadingKey === dataset.key
                    return (
                        <div
                            key={dataset.key}
                            className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
                        >
                            <div>
                                <p className="text-sm font-bold text-white">{dataset.label}</p>
                                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-500">
                                    {dataset.rowsHint}
                                </p>
                            </div>
                            <p className="flex-1 text-xs leading-relaxed text-gray-400">
                                {dataset.description}
                            </p>
                            <button
                                type="button"
                                onClick={() => handleDownload(dataset)}
                                disabled={isLoading || loadingKey !== null}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FC4C02] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FC4C02]/20 transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Mengunduh...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download CSV
                                    </>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
