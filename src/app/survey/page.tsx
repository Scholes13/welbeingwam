'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
// Custom Toast Hook
import { useToast } from '@/context/ToastContext'

interface Option {
    label?: string
    text?: string
    value?: string
    impact?: Record<string, number>
}

interface Question {
    id: string
    question_text: string
    options: Option[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SurveyPage() {
    const router = useRouter()
    // Use custom toast hook
    const { error: showError } = useToast()

    const { data, error, isLoading } = useSWR('/api/survey', fetcher)

    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<{ questionId: string; selectedOptionIndex: number }[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const [showResults, setShowResults] = useState(false)

    // Loading State with Premium Animation
    if (isLoading) return (
        <div className="min-h-screen bg-black text-white flex flex-col gap-6 items-center justify-center relative overflow-hidden">
            {/* Breathing Circle Animation */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-blue-500/20 blur-xl absolute"
            />
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-full"
            />
            <p className="text-neutral-400 text-sm tracking-widest uppercase animate-pulse">Preparing Experience...</p>
        </div>
    )

    // API Error Handling
    if (error || data?.error) {
        const errorMsg = typeof error === 'string' ? error : (data?.error || 'Failed to load survey configuration.')
        return (
            <div className="min-h-screen bg-black text-white flex flex-col gap-4 items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold text-red-500">System Error</h2>
                <p className="text-neutral-400 max-w-md">{errorMsg}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        )
    }

    const questions: Question[] = data?.questions || []

    // Parse options if they are strings (from database)
    questions.forEach((q: any) => {
        if (typeof q.options === 'string') {
            try {
                q.options = JSON.parse(q.options)
            } catch (e) {
                q.options = []
            }
        }
    })

    // Empty State Handling
    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-neutral-400">No survey questions enabled. Please check database content.</p>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]

    // Handle Option Click
    const handleSelectOption = (optionIndex: number) => {
        const newAnswers = [...answers]
        const existingIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id)

        if (existingIndex >= 0) {
            newAnswers[existingIndex] = { questionId: currentQuestion.id, selectedOptionIndex: optionIndex }
        } else {
            newAnswers.push({ questionId: currentQuestion.id, selectedOptionIndex: optionIndex })
        }

        setAnswers(newAnswers)

        // Auto Advance after short delay
        setTimeout(() => {
            handleNext()
        }, 400)
    }

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            // Submit
            setIsSubmitting(true)
            try {
                const res = await fetch('/api/recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers }),
                })
                const result = await res.json()
                setRecommendations(result.recommendations)
                setShowResults(true)
            } catch (err) {
                showError('Failed to calculate results.')
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    const handleBack = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }

    // --- RESULT VIEW ---
    if (showResults) {
        return (
            <div className="min-h-screen bg-neutral-900 text-white p-6 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-8 pt-12 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-2"
                    >
                        <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 to-amber-500 bg-clip-text text-transparent">
                            Your Perfect Flow
                        </h1>
                        <p className="text-neutral-400">Based on your energy & goals, we found matches.</p>
                    </motion.div>

                    <div className="space-y-4">
                        {recommendations.map((rec: any, idx: number) => (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.2 }}
                                className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700 shadow-xl relative overflow-hidden group"
                            >
                                {idx === 0 && (
                                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl z-20">
                                        BEST MATCH
                                    </div>
                                )}
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{rec.name}</h3>
                                        <p className="text-amber-400 text-sm font-medium mb-2">{rec.time} • {rec.instructor}</p>
                                        <p className="text-neutral-300 text-sm leading-relaxed">{rec.description}</p>

                                        {/* Reason Tags */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {rec.matchReasons?.map((reason: string) => (
                                                <span key={reason} className="px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300 text-xs capitalize">
                                                    {reason} Fit
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </motion.div>
                        ))}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-lg mt-8 flex items-center justify-center gap-2"
                    >
                        Go to Dashboard <ArrowRight className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        )
    }

    // --- SURVEY VIEW ---
    return (
        <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden">

            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-neutral-800 z-50">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Main Content: min-h-screen + py-20 ensures scrolling on small screens */}
            <div className="min-h-screen w-full flex flex-col justify-center pt-12 pb-12 md:py-24 px-6 relative z-10">
                <div className="max-w-lg mx-auto w-full">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-2 md:space-y-4">
                                <span className="text-xs md:text-sm font-medium text-neutral-500 uppercase tracking-widest">
                                    Question {currentIndex + 1}/{questions.length}
                                </span>
                                <h2 className="text-2xl md:text-4xl font-bold leading-tight bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent">
                                    {currentQuestion.question_text}
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    const isSelected = answers.find(a => a.questionId === currentQuestion.id)?.selectedOptionIndex === idx
                                    return (
                                        <motion.button
                                            key={idx}
                                            onClick={() => handleSelectOption(idx)}
                                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                              w-full text-left p-4 md:p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden
                                              ${isSelected
                                                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                                                    : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-600'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <span className={`text-base md:text-lg font-medium pr-4 ${isSelected ? 'text-blue-400' : 'text-neutral-200 group-hover:text-white'}`}>
                                                    {option.label || option.text}
                                                </span>
                                                {isSelected && <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-8 md:mt-12 text-sm text-neutral-500">
                        <button
                            onClick={handleBack}
                            disabled={currentIndex === 0}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-full transition-all
                                ${currentIndex === 0
                                    ? 'opacity-0 pointer-events-none'
                                    : 'bg-neutral-800 text-white hover:bg-neutral-700 active:scale-95'}
                            `}
                        >
                            <ArrowRight className="w-4 h-4 rotate-180" /> Back
                        </button>

                        {isSubmitting && <span className="animate-pulse text-blue-400 font-medium tracking-wide">Analyzing...</span>}
                    </div>
                </div>
            </div>

            {/* Background Decor */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
            </div>
        </div>
    )
}
