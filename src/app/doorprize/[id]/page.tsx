'use client'

import { useEffect, useState, useRef } from 'react'

// Actually, better to fetch everything via API or use client-side supabase for public read?
// Activities/Attendance usually requires admin rights to see?
// Scan API inserts. 
// We should probably use a new public GET endpoint or just use the Admin one if we are logged in as Admin?
// The user said "New Tab" -> Admin is likely logged in.
// So we can use standard client-side auth.

import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Trophy, Users, RefreshCw, X, Image as ImageIcon, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function DoorprizePage() {
    const params = useParams()
    const searchParams = useSearchParams()

    // State
    const [config, setConfig] = useState<any>(null)
    const [attendees, setAttendees] = useState<any[]>([])
    const [winners, setWinners] = useState<any[]>([]) // Current session winners
    const [pastWinners, setPastWinners] = useState<Set<string>>(new Set()) // DB winners
    const [loading, setLoading] = useState(true)
    const [rolling, setRolling] = useState(false)
    const [currentName, setCurrentName] = useState('READY TO ROLL')
    const [currentAvatar, setCurrentAvatar] = useState<string | null>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [editForm, setEditForm] = useState({ prize_name: '', quantity: 1, background_url: '' })
    const [isUploading, setIsUploading] = useState(false)

    // Params
    const doorprizeId = params.id as string

    // Derived
    const prizeName = config?.prize_name || 'Doorprize'
    const quantity = config?.quantity || 1
    const bgUrl = config?.background_url

    // Supabase


    // Fetch Data
    useEffect(() => {
        if (!doorprizeId) return
        fetchSession()
    }, [doorprizeId])

    const fetchSession = async () => {
        try {
            setLoading(true)
            // 1. Fetch Doorprize Config
            const res = await fetch(`/api/admin/doorprize/sessions?id=${doorprizeId}`)
            const data = await res.json()

            if (res.ok && data) {
                setConfig(data)
                setEditForm({
                    prize_name: data.prize_name,
                    quantity: data.quantity,
                    background_url: data.background_url || ''
                })

                // 2. Fetch Attendees (using activity_id from config)
                const actRes = await fetch(`/api/admin/activities/detail?id=${data.activity_id}`)
                const actData = await actRes.json()
                if (actRes.ok && actData.attendees) {
                    setAttendees(actData.attendees)
                }

                // 3. Fetch Winners (for THIS doorprize session)
                const winRes = await fetch(`/api/admin/doorprize/winners?doorprizeId=${doorprizeId}&activityId=${data.activity_id}`)
                const winData = await winRes.json()

                if (winRes.ok && winData.winners) {
                    // Flatten user data into winner object for easier access
                    const flattenedWinners = winData.winners.map((w: any) => ({
                        ...w,
                        user_id: w.user?.id || w.user_id,
                        username: w.user?.username || w.username,
                        full_name: w.user?.full_name || w.full_name,
                        avatar_url: w.user?.avatar_url || w.avatar_url,
                    }))
                    setWinners(flattenedWinners)
                    const pastIds = new Set(flattenedWinners.map((w: any) => w.user_id.toString()))
                    setPastWinners(pastIds as Set<string>)
                }
            } else {
                console.error('Doorprize not found')
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Save Config
    const handleSaveConfig = async () => {
        try {
            const res = await fetch('/api/admin/doorprize/sessions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: doorprizeId,
                    ...editForm,
                    activity_id: config.activity_id // Keep same activity
                })
            })
            if (res.ok) {
                fetchSession()
                setShowConfig(false)
            }
        } catch (error) {
            alert('Failed to save config')
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit')
            return
        }

        try {
            setIsUploading(true)
            const fileName = `bg-${doorprizeId}-${Date.now()}` // Unique name per upload

            // Upload to 'doorprize-assets' bucket
            const { data, error } = await supabase.storage
                .from('doorprize-assets')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (error) throw error

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('doorprize-assets')
                .getPublicUrl(fileName)

            setEditForm(prev => ({ ...prev, background_url: publicUrl }))

        } catch (error: any) {
            console.error('Upload error:', error)
            alert('Failed to upload image')
        } finally {
            setIsUploading(false)
        }
    }

    // Roll Logic - Pick ALL remaining winners at once
    const handleRoll = async () => {
        if (rolling || attendees.length === 0) return

        // How many winners still needed?
        const slotsRemaining = quantity - winners.length
        if (slotsRemaining <= 0) {
            alert('All winner slots are filled!')
            return
        }

        // Filter eligible (not already won)
        const eligible = attendees.filter(u => !pastWinners.has(u.user_id.toString()))

        if (eligible.length === 0) {
            alert('No eligible attendees left!')
            return
        }

        // How many can we actually pick?
        const pickCount = Math.min(slotsRemaining, eligible.length)

        setRolling(true)
        const duration = 3000 // 3 seconds roll animation
        const intervalTime = 80

        // State for rolling display - show random names during animation
        const interval = setInterval(() => {
            // Just show random names cycling during animation
            const randomUser = eligible[Math.floor(Math.random() * eligible.length)]
            setCurrentName(randomUser.full_name)
            setCurrentAvatar(randomUser.avatar_url)
        }, intervalTime)

        setTimeout(async () => {
            clearInterval(interval)

            // Pick winners - shuffle and take pickCount
            const shuffled = [...eligible].sort(() => Math.random() - 0.5)
            const newWinners = shuffled.slice(0, pickCount)

            // Update UI immediately
            setCurrentName(`🎉 ${pickCount} WINNER${pickCount > 1 ? 'S' : ''} SELECTED!`)
            setCurrentAvatar(null)
            setRolling(false)

            // Save all winners to DB
            const savedWinners: any[] = []
            for (const winner of newWinners) {
                try {
                    await fetch('/api/admin/doorprize/winners', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            activity_id: config.activity_id,
                            doorprize_id: doorprizeId,
                            user_id: winner.user_id,
                            prize_name: prizeName
                        })
                    })
                    savedWinners.push(winner)
                } catch (e) {
                    console.error('Failed to save winner', winner.full_name, e)
                }
            }

            // Update local state with all new winners
            setWinners(prev => [...savedWinners, ...prev])
            setPastWinners(prev => {
                const newSet = new Set(prev)
                savedWinners.forEach(w => newSet.add(w.user_id.toString()))
                return newSet
            })

            // Confetti for all winners!
            confetti({
                particleCount: 150 * pickCount,
                spread: 100,
                origin: { y: 0.5 },
                zIndex: 200
            })

        }, duration)
    }

    const resetWinners = async () => {
        if (!confirm('Reset all winners for this doorprize session?')) return
        await fetch(`/api/admin/doorprize/winners?doorprizeId=${doorprizeId}`, { method: 'DELETE' })
        setWinners([])
        setPastWinners(new Set())
        fetchSession()
    }

    if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading Doorprize...</div>

    // UI
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans flex flex-col items-center justify-center">
            {/* Background Image */}
            {bgUrl && (
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center transition-all duration-500"
                    style={{ backgroundImage: `url(${bgUrl})` }}
                />
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* Config Button (Hover to see) */}
            <div className="absolute top-4 right-4 z-50 opacity-10 hover:opacity-100 transition-opacity">
                <button onClick={() => setShowConfig(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                    <RefreshCw className="w-6 h-6" />
                </button>
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Doorprize Config</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Prize Name</label>
                                <input
                                    value={editForm.prize_name}
                                    onChange={e => setEditForm({ ...editForm, prize_name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={editForm.quantity}
                                    onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Background Image</label>
                                <div className="space-y-3">
                                    {editForm.background_url && (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/20">
                                            <img src={editForm.background_url} className="w-full h-full object-cover" alt="bg" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm">
                                            <ImageIcon size={16} />
                                            <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="hidden"
                                            />
                                        </label>
                                        <div className="text-xs text-gray-500">OR</div>
                                        <input
                                            value={editForm.background_url}
                                            onChange={e => setEditForm({ ...editForm, background_url: e.target.value })}
                                            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs flex-1"
                                            placeholder="Paste URL..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button onClick={() => setShowConfig(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                                <button onClick={handleSaveConfig} className="px-4 py-2 bg-[#FC4C02] rounded-lg font-bold">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Content */}
            <div className="relative z-10 w-full h-screen max-h-screen overflow-hidden flex flex-col justify-between py-4 md:py-8">

                {/* 1. Header (Fixed Top) */}
                <div className="flex-none flex flex-col items-center justify-center z-20 h-[15vh] min-h-[80px]">
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-lg leading-none">
                        {prizeName}
                    </h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FC4C02]/20 border border-[#FC4C02]/50 text-[#FC4C02] font-bold tracking-widest uppercase text-[10px] md:text-xs">
                        <Trophy size={12} className="md:w-3.5 md:h-3.5" /> Doorprize
                    </div>
                </div>

                {/* 2. Main Display (Flexible Middle) */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0 w-full px-4 py-2">
                    <AnimatePresence mode="wait">
                        {quantity > 1 ? (
                            /* MULTI WINNER GRID LAYOUT */
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-[85rem] h-full overflow-y-auto p-2"
                            >
                                <div className={`
                                    grid gap-4 w-full place-items-center
                                    ${quantity === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                                        quantity === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
                                            quantity === 3 ? 'grid-cols-3 max-w-3xl mx-auto' :
                                                quantity <= 6 ? 'grid-cols-3 lg:grid-cols-4 max-w-5xl mx-auto' :
                                                    quantity <= 9 ? 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
                                                        'grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'}
                                `}>
                                    {Array.from({ length: quantity }).map((_, i) => {
                                        const winner = winners[i]
                                        // Show rolling animation on ALL empty slots
                                        const isEmptySlot = !winner
                                        const isRollingThis = isEmptySlot && rolling

                                        return (
                                            <div
                                                key={i}
                                                className={`
                                                    relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300
                                                    ${winner
                                                        ? 'bg-[#FC4C02]/10 border-[#FC4C02] shadow-[0_0_15px_rgba(252,76,2,0.3)]'
                                                        : isRollingThis
                                                            ? 'bg-white/5 border-white/30 animate-pulse'
                                                            : 'bg-black/40 border-white/10 opacity-60'}
                                                `}
                                            >
                                                {/* Header Number */}
                                                <div className="absolute top-2 left-3 text-[10px] font-bold text-gray-500">#{i + 1}</div>

                                                {/* Avatar */}
                                                <div className={`
                                                    aspect-square w-16 md:w-20 lg:w-24 rounded-full border-[3px] overflow-hidden mb-2 relative
                                                    ${winner ? 'border-[#FC4C02]' : 'border-gray-600'}
                                                `}>
                                                    {winner ? (
                                                        <img src={winner.avatar_url} className="w-full h-full object-cover" />
                                                    ) : isRollingThis && currentAvatar ? (
                                                        <img src={currentAvatar} className="w-full h-full object-cover opacity-80" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                            <Users className="w-1/2 h-1/2 text-gray-600" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Name */}
                                                <div className={`
                                                    text-center font-bold leading-tight w-full truncate px-2
                                                    ${winner ? 'text-white text-sm md:text-base' : isRollingThis ? 'text-yellow-400 text-sm' : 'text-gray-600 text-xs'}
                                                `}>
                                                    {winner ? winner.full_name : isRollingThis ? currentName : 'Empty Slot'}
                                                </div>

                                                {winner && <div className="text-[10px] text-[#FC4C02] truncate w-full text-center">@{winner.username}</div>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            /* SINGLE WINNER LAYOUT (Original) */
                            <motion.div
                                key="single"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0, position: 'absolute' }}
                                className="flex flex-col items-center justify-center w-full h-full max-h-full"
                            >
                                {/* Avatar */}
                                <div className={`
                                    aspect-square rounded-full border-[6px] md:border-8 overflow-hidden shadow-2xl relative transition-all duration-300 flex-shrink-1
                                    ${rolling ? 'border-gray-700 animate-pulse' : 'border-[#FC4C02] shadow-[#FC4C02]/50'}
                                `}
                                    style={{ height: 'min(35vh, 35vw)', width: 'min(35vh, 35vw)' }}
                                >
                                    {currentAvatar ? (
                                        <img src={currentAvatar} alt="Winner" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                            <Users className="w-1/3 h-1/3 text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Name */}
                                <h2 className={`
                                    font-black tracking-tight leading-none text-center mt-4 md:mt-8 break-words w-full max-w-[90vw]
                                    ${rolling ? 'text-gray-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-[#FC4C02]'}
                                `}
                                    style={{ fontSize: 'min(6vh, 8vw)', lineHeight: 1.1 }}
                                >
                                    {currentName}
                                </h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. Controls (Fixed Bottom) */}
                <div className="flex-none flex flex-col items-center justify-end z-50 h-[20vh] min-h-[120px] pb-6 gap-4 pointer-events-auto">
                    <button
                        onClick={handleRoll}
                        disabled={rolling || attendees.length === 0 || winners.length >= quantity}
                        className={`
                            px-8 md:px-12 py-3 md:py-5 rounded-full font-black uppercase tracking-widest transition-all
                            shadow-[0_0_20px_rgba(252,76,2,0.3)] hover:shadow-[0_0_40px_rgba(252,76,2,0.5)] hover:scale-105 active:scale-95
                            disabled:opacity-50 disabled:pointer-events-none cursor-pointer
                            bg-[#FC4C02] text-white relative z-50 select-none
                        `}
                        style={{ fontSize: 'min(2.5vh, 4vw)' }}
                    >
                        {rolling
                            ? 'Rolling...'
                            : winners.length >= quantity
                                ? 'All Winners Picked'
                                : `Roll ${quantity - winners.length} Winner${quantity - winners.length > 1 ? 's' : ''}`}
                    </button>

                    <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/5 z-50">
                        <span>Attended: {attendees.length}</span>
                        <span>•</span>
                        <span>Winners: {pastWinners.size}</span>
                        <span>•</span>
                        <button onClick={resetWinners} className="hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer z-50">
                            <RefreshCw size={10} /> Reset
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
