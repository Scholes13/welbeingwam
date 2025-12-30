'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SurveyCard from '@/components/survey/SurveyCard'
import { Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

// Types
interface Option {
    id: string
    label: string
    value: string
    question_id: string
}

interface Question {
    id: string
    text: string
    question_text: string
    options: Option[]
}

export default function SurveyPage() {
    const params = useParams()
    const router = useRouter()
    const surveyId = params?.id

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [finished, setFinished] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [surveyTitle, setSurveyTitle] = useState('')

    useEffect(() => {
        if (!surveyId) return

        async function loadSurvey() {
            // Fetch Survey Details
            const { data: sData, error: sError } = await supabase
                .from('surveys')
                .select('title, description')
                .eq('id', surveyId)
                .single()

            if (sData) setSurveyTitle(sData.title)

            // Fetch Questions for THIS survey
            const { data: qData, error: qError } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('order_index')

            if (qError) {
                console.error(qError)
                setLoading(false)
                return
            }

            // Fetch Options for all questions
            const { data: oData, error: oError } = await supabase
                .from('survey_options')
                .select('*')

            if (oError) {
                console.error(oError)
                setLoading(false)
                return
            }

            // Combine them
            const fullQuestions = qData.map(q => ({
                id: q.id,
                text: q.question_text,
                question_text: q.question_text,
                options: oData.filter(o => o.question_id === q.id)
            }))

            setQuestions(fullQuestions)
            setLoading(false)
        }

        loadSurvey()
    }, [surveyId])

    const handleAnswer = async (value: string) => {
        const currentQ = questions[currentIndex]
        setAnswers({ ...answers, [currentQ.id]: value })

        if (currentIndex < questions.length - 1) {
            setTimeout(() => setCurrentIndex(prev => prev + 1), 300)
        } else {
            setAnalyzing(true)

            // Save Responses to DB (Optional for now)
            // await saveResponses(answers)

            setTimeout(() => {
                setAnalyzing(false)
                setFinished(true)
            }, 2000)
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Survey...</div>
    }

    if (analyzing) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 text-[#FC4C02] animate-spin mb-4" />
                <h2 className="text-xl font-medium animate-pulse">Analyzing your profile...</h2>
            </div>
        )
    }

    if (finished) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FC4C02] to-orange-500 bg-clip-text text-transparent mb-4">
                        Analysis Complete
                    </h1>
                    <p className="text-zinc-400 max-w-md mx-auto mb-8">
                        Thank you for completing the <strong>{surveyTitle}</strong>.
                        Based on your answers, we've curated a personalized wellness protocol for you.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4">
            <button
                onClick={() => router.back()}
                className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 z-50 pointer-events-auto"
            >
                <ArrowLeft size={20} /> Exit
            </button>

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">{surveyTitle}</h1>
                </div>

                {questions.length > 0 ? (
                    <>
                        <AnimatePresence mode="wait">
                            <SurveyCard
                                key={currentIndex}
                                question={questions[currentIndex]}
                                onAnswer={handleAnswer}
                            />
                        </AnimatePresence>

                        <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-3">
                            {questions.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-500 ease-out ${idx === currentIndex
                                        ? 'w-12 bg-gradient-to-r from-[#FC4C02] to-orange-400 shadow-[0_0_10px_#FC4C02]'
                                        : 'w-2 bg-zinc-800'
                                        }`}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-400">
                        <p>No questions found for this survey.</p>
                        <button onClick={() => router.back()} className="mt-4 text-[#FC4C02] hover:underline">Go Back</button>
                    </div>
                )}
            </div>
        </div>
    )
}
