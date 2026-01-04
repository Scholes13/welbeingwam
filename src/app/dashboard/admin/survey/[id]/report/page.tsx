'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Users, BarChart2, Calendar, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
// Custom Toast Hook
import { useToast } from '@/context/ToastContext'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SurveyReportPage() {
    const params = useParams()
    const router = useRouter()
    const surveyId = params?.id as string

    const { data, error, isLoading } = useSWR(surveyId ? `/api/admin/surveys/analytics?surveyId=${surveyId}` : null, fetcher)

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error || data?.error) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Report</h1>
                    <p className="text-gray-400 mb-6">{typeof error === 'string' ? error : data?.error}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    const { meta, analytics, recent = [] } = data || {}

    // CSV Export Function
    const handleExport = () => {
        if (!analytics) return

        let csvContent = "data:text/csv;charset=utf-8,"
        // 1. Summary Header
        csvContent += `Total Submissions,${meta.totalSubmissions}\n\n`

        // 2. Question Data
        analytics.forEach((q: any) => {
            csvContent += `Question,${q.questionText.replace(/,/g, ' ')}\n`
            csvContent += `Dominant Answer,${q.dominantAnswer}\n`
            csvContent += `Option,Count,Percentage\n`
            q.distribution.forEach((opt: any) => {
                csvContent += `${opt.label},${opt.count},${opt.percentage}%\n`
            })
            csvContent += `\n`
        })

        // 3. User List
        csvContent += `Recent Participants\n`
        csvContent += `Name,Date\n`
        recent.forEach((r: any) => {
            csvContent += `${r.name},${new Date(r.date).toLocaleString()}\n`
        })

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `survey_report_${surveyId}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
                        >
                            <ArrowLeft size={18} /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Survey Analytics
                        </h1>
                        <p className="text-gray-400 text-sm">Insights from user submissions</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl flex items-center gap-3">
                            <Users size={20} className="text-blue-500" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Respondents</p>
                                <p className="text-xl font-bold">{meta.totalSubmissions}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors h-full"
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Key Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Render charts for each question */}
                    {analytics.map((q: any) => (
                        <motion.div
                            key={q.questionId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all"
                        >
                            <div className="mb-4 min-h-[4em]">
                                <h3 className="font-bold text-lg leading-tight mb-1">{q.questionText}</h3>
                                <p className="text-xs text-gray-500">Most common: <span className="text-blue-400 font-medium">{q.dominantAnswer}</span></p>
                            </div>

                            <div className="space-y-3">
                                {q.distribution.map((opt: any, idx: number) => (
                                    <div key={idx} className="relative group">
                                        <div className="flex justify-between text-sm mb-1 z-10 relative">
                                            <span className="text-gray-300 truncate max-w-[70%]">{opt.label}</span>
                                            <span className="text-gray-400 font-mono">{opt.count} ({opt.percentage}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${opt.percentage}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${opt.label === q.dominantAnswer ? 'bg-blue-500' : 'bg-neutral-600'}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Recent Activity Table */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-purple-500" /> Recent Activity
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-neutral-950/50 text-gray-500 border-b border-neutral-800">
                                <tr>
                                    <th className="px-6 py-3">Participant</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {recent.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No submissions yet.</td>
                                    </tr>
                                ) : (
                                    recent.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                                    {r.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                {r.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                                    Completed
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(r.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
