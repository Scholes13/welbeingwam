'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils' // Assuming you have a utility for merging classes, if not I'll just use template literals or install clsx/tailwind-merge if needed (package.json says they exist)

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
    id: string
    message: string
    type: ToastType
    onDismiss: (id: string) => void
}

const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
}

const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20'
}

export default function Toast({ id, message, type, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id)
        }, 3000)

        return () => clearTimeout(timer)
    }, [id, onDismiss])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg min-w-[300px] max-w-sm ${bgColors[type]} bg-[#1a1a1a]`}
        >
            <div className="shrink-0">{icons[type]}</div>
            <p className="text-sm font-medium text-white/90 flex-1">{message}</p>
            <button
                onClick={() => onDismiss(id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors"
            >
                <X size={16} />
            </button>
        </motion.div>
    )
}
