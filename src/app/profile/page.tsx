'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { LogOut, Settings, Activity, Scan, Footprints, Trophy } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useProfile } from '@/hooks/use-swr-hooks'

import Loader from '@/components/ui/Loader'

export default function ProfilePage() {
    const { profile, stats, totalPoints, coins, isLoading: loading } = useProfile()
    const [showIdCard, setShowIdCard] = useState(false)
    const router = useRouter()

    // Auto-fetched by SWR

    const handleLogout = () => {
        router.push('/api/auth/logout')
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
                {/* Profile Header */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative mb-4">
                        <img
                            src={profile.profile}
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
                        WAM25 v0.1.0 Beta<br />
                        Connected to Strava
                    </p>
                </div>
            </div>

            {/* ID Card Modal */}
            {showIdCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowIdCard(false)}>
                    <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Card Background Pattern */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[#FC4C02] to-orange-400" />

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
