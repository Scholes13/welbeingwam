'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface Option {
    id: string
    label: string
    value: string
}

interface Question {
    id: string
    text: string
    options: Option[]
}

interface SurveyCardProps {
    question: Question
    onAnswer: (optionId: string) => void
}

export default function SurveyCard({ question, onAnswer }: SurveyCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full backdrop-blur-2xl bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden"
        >
            {/* Subtle highlight */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-white tracking-tight leading-tight">
                {question.text}
            </h2>

            <div className="space-y-4">
                {question.options.map((option, idx) => (
                    <motion.button
                        key={option.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        onClick={() => onAnswer(option.value)}
                        className="w-full p-6 rounded-2xl bg-zinc-900/50 hover:bg-[#FC4C02] text-left transition-all duration-300 flex items-center justify-between group border border-white/5 hover:border-[#FC4C02] hover:shadow-[0_0_20px_rgba(252,76,2,0.3)] hover:scale-[1.02]"
                    >
                        <span className="font-medium text-lg text-zinc-300 group-hover:text-white">
                            {option.label}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white text-transparent group-hover:text-[#FC4C02] transition-all">
                            <Check className="w-5 h-5" />
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    )
}
