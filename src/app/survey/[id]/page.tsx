'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, ArrowRight, Heart, ThumbsUp, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
// Custom Toast Hook
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase/client'

interface Option {
    label?: string
    text?: string
    value?: string
    impact?: Record<string, number>
}

interface Question {
    id: string
    question_text: string
    question_type?: 'choice' | 'text' | 'textarea' | 'image'
    options: Option[]
}

interface Answer {
    questionId: string
    selectedOptionIndex?: number
    responseText?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DynamicSurveyPage() {
    const router = useRouter()
    const params = useParams()
    const surveyId = params?.id as string

    // Use custom toast hook
    const { error: showError, success: showSuccess } = useToast()

    // Pass surveyID to API
    const { data, error, isLoading } = useSWR(surveyId ? `/api/survey?id=${surveyId}` : null, fetcher)

    // Survey metadata
    const [surveyTitle, setSurveyTitle] = useState('')
    const [isFeedbackSurvey, setIsFeedbackSurvey] = useState(false)

    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Answer[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const [showResults, setShowResults] = useState(false)

    // File Upload State
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch survey metadata to determine type
    useEffect(() => {
        if (surveyId) {
            fetch(`/api/surveys/${surveyId}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.survey) {
                        setSurveyTitle(data.survey.title || '')
                        // Check if this is a feedback survey (title contains "Feedback")
                        setIsFeedbackSurvey(data.survey.title?.toLowerCase().includes('feedback'))
                    }
                })
                .catch(() => { })
        }
    }, [surveyId])

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

    // Empty State Handling
    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-neutral-400">No survey questions enabled for this ID.</p>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]
    const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)

    // Helper to update answers
    const updateAnswer = (newAnswer: Answer) => {
        setAnswers(prev => {
            const index = prev.findIndex(a => a.questionId === newAnswer.questionId)
            if (index >= 0) {
                const updated = [...prev]
                updated[index] = newAnswer
                return updated
            }
            return [...prev, newAnswer]
        })
    }

    // Handle Option Click (Choice)
    const handleSelectOption = (optionIndex: number) => {
        updateAnswer({
            questionId: currentQuestion.id,
            selectedOptionIndex: optionIndex
        })

        // Auto Advance for Choice questions
        setTimeout(() => {
            handleNext()
        }, 300)
    }

    // Handle Text Input
    const handleTextChange = (text: string) => {
        updateAnswer({
            questionId: currentQuestion.id,
            responseText: text
        })
    }

    // Handle File Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        if (file.size > 5 * 1024 * 1024) {
            showError('File too large (max 5MB)')
            return
        }

        try {
            setIsUploading(true)
            // const supabase = createClient() // Use singleton
            const fileName = `${surveyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`

            const { data, error } = await supabase.storage
                .from('survey-uploads')
                .upload(fileName, file, { upsert: true })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('survey-uploads')
                .getPublicUrl(fileName)

            updateAnswer({
                questionId: currentQuestion.id,
                responseText: publicUrl
            })

            showSuccess('Photo uploaded!')
        } catch (err: any) {
            console.error(err)
            showError('Upload failed: ' + err.message)
        } finally {
            setIsUploading(false)
        }
    }

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            // Submit
            setIsSubmitting(true)
            try {
                // First, fetch survey metadata to determine type
                const surveyMetaRes = await fetch(`/api/surveys/${surveyId}`)
                const surveyMeta = await surveyMetaRes.json()
                const surveyTitle = surveyMeta?.survey?.title?.toLowerCase() || ''

                // Only "Corporate Wellbeing" survey shows recommendations
                const isRecommendationSurvey = surveyTitle.includes('corporate')

                // For logic routing
                setIsFeedbackSurvey(!isRecommendationSurvey)

                // ALWAYS save survey responses first
                await fetch('/api/surveys/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ surveyId, answers }),
                })

                // Only fetch recommendations for recommendation surveys
                if (isRecommendationSurvey) {
                    const res = await fetch('/api/recommendations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answers, surveyId }),
                    })
                    const result = await res.json()
                    setRecommendations(result.recommendations || [])
                }

                setShowResults(true)
            } catch (err) {
                showError('Failed to save answers.')
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
        // FEEDBACK / GENERIC SURVEY - Show Thank You
        if (isFeedbackSurvey) {
            return (
                <div className="min-h-screen bg-neutral-900 text-white p-6 overflow-y-auto">
                    <div className="max-w-md mx-auto space-y-8 pt-20 pb-20">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.4)]"
                            >
                                <ThumbsUp className="w-12 h-12 text-white" />
                            </motion.div>

                            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">
                                Terima Kasih!
                            </h1>

                            <p className="text-neutral-300 text-lg leading-relaxed">
                                Feedback kamu sangat berarti bagi kami.
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg mt-8 flex items-center justify-center gap-2"
                            >
                                Kembali ke Dashboard <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            )
        }

        // RECOMMENDATION SURVEY - Show Matches
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
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{rec.name}</h3>
                                        <p className="text-amber-400 text-sm font-medium mb-2">{rec.time} • {rec.instructor}</p>
                                        <p className="text-neutral-300 text-sm leading-relaxed">{rec.description}</p>
                                    </div>
                                </div>
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
    const questionType = currentQuestion.question_type || 'choice' // Default to choice

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

                            <div className="space-y-4">
                                {/* RENDER BASED ON TYPE */}
                                {questionType === 'choice' && (
                                    <div className="space-y-3">
                                        {currentQuestion.options.map((option, idx) => {
                                            const isSelected = currentAnswer?.selectedOptionIndex === idx
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
                                                            {option.label}
                                                        </span>
                                                        {isSelected && <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                                                    </div>
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                )}

                                {questionType === 'text' && (
                                    <input
                                        type="text"
                                        placeholder="Type your answer here..."
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        value={currentAnswer?.responseText || ''}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        autoFocus
                                    />
                                )}

                                {questionType === 'textarea' && (
                                    <textarea
                                        rows={5}
                                        placeholder="Share your story..."
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                        value={currentAnswer?.responseText || ''}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        autoFocus
                                    />
                                )}

                                {questionType === 'image' && (
                                    <div className="space-y-4">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`
                                                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors
                                                ${currentAnswer?.responseText ? 'border-green-500/50 bg-green-500/10' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900'}
                                            `}
                                        >
                                            {currentAnswer?.responseText ? (
                                                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                                    <img src={currentAnswer.responseText} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-sm font-bold flex items-center gap-2"><ImageIcon size={16} /> Change Photo</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    {isUploading ? (
                                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                                                    ) : (
                                                        <Upload className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                                                    )}
                                                    <p className="text-neutral-300 font-medium">{isUploading ? 'Uploading...' : 'Click to Upload Photo'}</p>
                                                    <p className="text-neutral-500 text-sm mt-1">PG, JPG, WEBP (Max 5MB)</p>
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                        </div>
                                    </div>
                                )}
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

                        <button
                            onClick={handleNext}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all
                                ${questionType !== 'choice'
                                    ? 'bg-[#FC4C02] text-white hover:bg-[#e04302] shadow-lg shadow-orange-900/20' // Visible Next button for Inputs
                                    : 'opacity-0 pointer-events-none' // Hidden for choice (auto advance)
                                }
                            `}
                        >
                            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" />
                        </button>

                        {isSubmitting && <span className="animate-pulse text-blue-400 font-medium tracking-wide">Done...</span>}
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
