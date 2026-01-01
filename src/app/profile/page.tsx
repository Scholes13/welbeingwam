'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Coins, Award, LogOut, Settings, User, Trophy, CreditCard, Scan, Send, X, Loader2, Footprints } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useProfile } from '@/hooks/use-swr-hooks'
import { useToast } from '@/context/ToastContext'
import { Scanner } from '@yudiel/react-qr-scanner'
import Loader from '@/components/ui/Loader'

export default function ProfilePage() {
    const { profile, stats, totalPoints, coins, isLoading: loading } = useProfile()
    const [showIdCard, setShowIdCard] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [scannedUser, setScannedUser] = useState<any>(null)
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const router = useRouter()
    const { success, error } = useToast()

    // Auto-fetched by SWR

    const handleLogout = () => {
        router.push('/api/auth/logout')
    }

    const handleScan = async (result: any[]) => {
        if (!result || result.length === 0) return
        const code = result[0].rawValue

        // Prevent multiple scans
        if (scannedUser) return

        try {
            // Check if it's a SPOT code (starts with SPOT-)
            if (code.startsWith('SPOT-')) {
                const res = await fetch('/api/spots/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                })
                const data = await res.json()

                if (res.ok) {
                    success(data.message || `🎯 +${data.points} poin dari ${data.spotName}!`)
                } else {
                    error(data.error || 'QR Code tidak valid')
                }
                setIsScannerOpen(false)
                return
            }

            // Otherwise it's a user QR code
            const res = await fetch('/api/user/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: code })
            })
            const data = await res.json()

            if (res.ok) {
                setScannedUser(data.user)
                setIsScannerOpen(false)
            } else {
                error(data.error || 'Invalid QR')
                setIsScannerOpen(false)
            }
        } catch (e) {
            error('Scan failed')
            setIsScannerOpen(false)
        }
    }

    const handleSendMessage = async () => {
        if (!message.trim()) return
        setSending(true)
        try {
            const res = await fetch('/api/user/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: scannedUser.id, message })
            })
            if (res.ok) {
                success('Message sent!')
                setScannedUser(null)
                setMessage('')
            } else {
                error('Failed to send')
            }
        } catch (e) {
            error('Error sending message')
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return <Loader text="LOADING PROFILE..." />
    }

    if (!profile) return null

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[20%] w-[400px] h-[400px] bg-blue-900 rounded-full mix-blend-screen filter blur-[100px] opacity-20" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto pt-8">
                {/* Scanner Modal */}
                {isScannerOpen && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                        <button onClick={() => setIsScannerOpen(false)} className="absolute top-4 right-4 text-white">
                            <X size={32} />
                        </button>
                        <div className="w-full max-w-sm aspect-square bg-black border-2 border-[#FC4C02] rounded-2xl overflow-hidden relative">
                            <Scanner onScan={handleScan} />
                        </div>
                        <p className="text-white mt-4 font-mono text-sm">Scan user QR Code</p>
                    </div>
                )}

                {/* Message Modal */}
                {scannedUser && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-[#1a1a1a] border border-[#FC4C02] rounded-2xl p-6 w-full max-w-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">Send Message</h3>
                                <button onClick={() => setScannedUser(null)} className="text-gray-400"><X size={20} /></button>
                            </div>
                            <div className="flex items-center gap-3 mb-4 p-3 bg-black/50 rounded-lg">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                                    <img src={scannedUser.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">@{scannedUser.username}</p>
                                    <p className="text-xs text-gray-500">{scannedUser.full_name}</p>
                                </div>
                            </div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm focus:border-[#FC4C02] outline-none mb-4 h-24 resize-none"
                                placeholder="Type your message..."
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sending || !message.trim()}
                                className="w-full py-2 bg-[#FC4C02] rounded-lg font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
                                Send Message
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="flex justify-between items-center mb-8 relative">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#FC4C02]">
                                <img src={profile.avatar_url || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix'} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-[#FC4C02]">
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" className="fill-yellow-500" />
                                    <path d="M12 6V18M12 6C14 6 15 7 15 9C15 11 13.5 12 12 12M12 6C10.5 6 9 7 9 9C9 10 9.5 11 11 11.5M12 18C10.5 18 9 17 9 15C9 13 10.5 12 12 12M12 18C13.5 18 15 17 15 15C15 14 14.5 13 13 12.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{profile.full_name || `@${profile.username}`}</h1>
                            <p className="text-xs text-gray-400 font-mono">@{profile.username}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 relative">
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                        >
                            <Scan size={20} className="text-[#FC4C02]" />
                        </button>

                        <Link href="/profile/settings" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                            <Settings size={20} className="text-gray-400" />
                        </Link>
                    </div>
                </header>

                {/* Profile Header */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative mb-4">
                        <img
                            src={profile.avatar_url}
                            alt={profile.username}
                            className="w-28 h-28 rounded-full border-4 border-[#FC4C02]/20 object-cover shadow-[0_0_30px_rgba(252,76,2,0.2)]"
                        />
                        <div className="absolute bottom-0 right-0 bg-[#FC4C02] text-white p-1.5 rounded-full border-4 border-black">
                            <div className="w-5 h-5 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" className="fill-yellow-500" />
                                    <path d="M12 6V18M12 6C14 6 15 7 15 9C15 11 13.5 12 12 12M12 6C10.5 6 9 7 9 9C9 10 9.5 11 11 11.5M12 18C10.5 18 9 17 9 15C9 13 10.5 12 12 12M12 18C13.5 18 15 17 15 15C15 14 14.5 13 13 12.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold">{profile.firstname} {profile.lastname}</h1>
                    <p className="text-gray-500">@{profile.username}</p>
                    <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">{profile.city}, {profile.country}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Footprints className="w-6 h-6 text-[#FC4C02] mb-2" />
                        <span className="text-2xl font-bold font-mono">{stats.steps.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 uppercase">Steps</span>
                    </div>
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                        <span className="text-2xl font-bold font-mono">{totalPoints.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 uppercase">Total Points</span>
                    </div>
                </div>

                {/* Coins Wallet */}
                <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-md border border-[#FC4C02]/30 p-5 rounded-2xl flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#FC4C02]/20 rounded-xl text-[#FC4C02]">
                            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" className="fill-yellow-500" />
                                <path d="M12 6V18M12 6C14 6 15 7 15 9C15 11 13.5 12 12 12M12 6C10.5 6 9 7 9 9C9 10 9.5 11 11 11.5M12 18C10.5 18 9 17 9 15C9 13 10.5 12 12 12M12 18C13.5 18 15 17 15 15C15 14 14.5 13 13 12.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <span className="block text-2xl font-bold font-mono text-white">{coins?.toLocaleString() || 0}</span>
                            <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">Available Coins</span>
                        </div>
                    </div>
                    <Link href="/rewards" className="px-4 py-2 bg-[#FC4C02] hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-lg transition-colors">
                        Redeem
                    </Link>
                </div>

                {/* Menu */}
                <div className="space-y-3">
                    <div className="bg-gray-900/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">

                        {/* ID Card Button */}
                        <button
                            onClick={() => setShowIdCard(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                    <Scan className="w-5 h-5" />
                                </div>
                                <span className="font-medium">My ID Card</span>
                            </div>
                            <span className="text-gray-500">→</span>
                        </button>

                        <Link href="/profile/settings" className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Settings</span>
                            </div>
                            <span className="text-gray-500">→</span>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-red-400"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Log Out</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-xs text-gray-600">
                        ScalingImpact v1.0 Beta
                    </p>
                </div>
            </div>

            {/* ID Card Modal */}
            {showIdCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowIdCard(false)}>
                    <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Card Background */}
                        {(() => {
                            const backgrounds: Record<string, { gradient: string, image?: string }> = {
                                default: { gradient: 'linear-gradient(to right, #FC4C02, #ff7043)' },
                                olympus: { gradient: 'linear-gradient(to right, #ffd700, #ffffff)', image: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=800&h=400&fit=crop&q=80' },
                                christmas: { gradient: 'linear-gradient(to right, #c41e3a, #165b33)', image: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&h=400&fit=crop&q=80' },
                                newyear: { gradient: 'linear-gradient(to right, #0f0c29, #24243e)', image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&h=400&fit=crop&q=80' },
                                bali: { gradient: 'linear-gradient(to right, #ff6b35, #9b4dca)', image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=400&fit=crop&q=80' },
                                street: { gradient: 'linear-gradient(to right, #2b5876, #4e4376)', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop&q=80' },
                            }
                            const bg = backgrounds[profile.card_background as string] || backgrounds.default
                            return bg.image ? (
                                <div className="absolute top-0 left-0 w-full h-32 bg-cover bg-center" style={{ backgroundImage: `url(${bg.image})` }} />
                            ) : (
                                <div className="absolute top-0 left-0 w-full h-32" style={{ background: bg.gradient }} />
                            )
                        })()}

                        <div className="relative flex flex-col items-center">
                            <div className="bg-white p-1.5 rounded-full mb-4 shadow-lg mt-8">
                                <img
                                    src={profile.profile}
                                    alt={profile.username}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white"
                                />
                            </div>

                            <h2 className="text-2xl font-bold mb-1">{profile.firstname} {profile.lastname}</h2>
                            <p className="text-gray-500 mb-6">@{profile.instagram_username || profile.username}</p>

                            <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.1)] mb-4">
                                <QRCode
                                    value={profile.access_code || 'NO-CODE'}
                                    size={180}
                                    level="H"
                                />
                            </div>

                            <p className="font-mono text-xl font-bold tracking-widest text-[#FC4C02] mb-8">
                                {profile.access_code}
                            </p>

                            <button
                                onClick={() => setShowIdCard(false)}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
