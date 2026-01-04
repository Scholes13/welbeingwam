'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Lock, Unlock, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClueData {
    unlocked: boolean
    message?: string
    clues: Array<{ name: string; clue: string }>
}

export default function CluesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ClueData | null>(null)

    useEffect(() => {
        fetchClues()
    }, [])

    const fetchClues = async () => {
        try {
            const res = await fetch('/api/spots/clues')
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error('Failed to fetch clues:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-yellow-500 rounded-full mix-blend-screen filter blur-[80px] opacity-15" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-8 p-4">
                    <button
                        onClick={() => router.push('/rewards')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to Rewards
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        🗺️ Spot Clues
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Hints to help you find hidden QR spots!
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-yellow-500" size={40} />
                    </div>
                ) : !data?.unlocked ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                            <Lock size={40} className="text-gray-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Clues Locked</h2>
                        <p className="text-gray-400 mb-6">{data?.message || 'Claim the "Reveal Clue" reward to unlock hints!'}</p>
                        <button
                            onClick={() => router.push('/rewards')}
                            className="bg-[#FC4C02] text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                        >
                            Go to Rewards
                        </button>
                    </motion.div>
                ) : data.clues.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Unlock size={40} className="text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Clues Unlocked!</h2>
                        <p className="text-gray-400">No active spots with clues right now. Check back later!</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Unlock size={16} className="text-green-500" />
                            <span className="text-green-500 text-sm font-medium">Clues Unlocked!</span>
                        </div>

                        {data.clues.map((clue, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} className="text-yellow-500" />
                                    <h3 className="font-bold text-yellow-400">{clue.name}</h3>
                                </div>
                                <p className="text-gray-300 text-sm italic">"{clue.clue}"</p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
