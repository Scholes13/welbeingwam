'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Footprints, MapPin, Calendar, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddActivityBtn() {
    const [isOpen, setIsOpen] = useState(false)
    const [steps, setSteps] = useState('')
    const [distance, setDistance] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async () => {
        if (!steps) return
        setLoading(true)

        try {
            const res = await fetch('/api/activities/create', {
                method: 'POST',
                body: JSON.stringify({
                    steps: parseInt(steps),
                    distance: 0, // No distance for manual step entries
                    date,
                    type: 'Manual'
                })
            })

            if (res.ok) {
                setIsOpen(false)
                setSteps('')
                setDistance('')
                router.refresh()
                // Force reload to update dashboard
                window.location.reload()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 bg-[#FC4C02] text-white p-4 rounded-full shadow-2xl z-40 hover:scale-110 transition-transform"
            >
                <Plus size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold mb-6">Add Manual Activity</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Steps</label>
                                    <div className="relative">
                                        <Footprints className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                                        <input
                                            type="number"
                                            value={steps}
                                            onChange={(e) => setSteps(e.target.value)}
                                            placeholder="e.g. 5000"
                                            className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !steps}
                                    className="w-full bg-[#FC4C02] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors mt-2"
                                >
                                    {loading ? 'Saving...' : 'Save Activity'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
