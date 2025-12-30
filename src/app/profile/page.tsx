'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogOut, Settings, Award, Activity } from 'lucide-react'

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState({ count: 0, distance: 0, steps: 0 })
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            // 1. Get Auth Session (or use Strava token check from server if needed, but client-side is fine for display)
            // We'll fetch from our API to ensure we have the latest synced data
            const res = await fetch('/api/strava/sync')
            if (res.status === 401) {
                router.push('/')
                return
            }

            const data = await res.json()
            setProfile(data.profile)

            // Calculate stats from activities
            if (data.activities) {
                const totalDistance = data.activities.reduce((acc: number, curr: any) => acc + curr.distance, 0)
                const totalSteps = data.activities.reduce((acc: number, curr: any) => acc + (curr.steps || 0), 0)
                setStats({
                    count: data.activities.length,
                    distance: totalDistance,
                    steps: totalSteps
                })
            }

        } catch (error) {
            console.error('Error loading profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        router.push('/api/auth/logout')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-pulse text-[#FC4C02]">Loading Profile...</div>
            </div>
        )
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
                            <Award className="w-5 h-5" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold">{profile.firstname} {profile.lastname}</h1>
                    <p className="text-gray-500">@{profile.username}</p>
                    <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">{profile.city}, {profile.country}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Activity className="w-6 h-6 text-[#FC4C02] mb-2" />
                        <span className="text-2xl font-bold font-mono">{(stats.distance / 1000).toFixed(1)}</span>
                        <span className="text-xs text-gray-500 uppercase">Kilometers</span>
                    </div>
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold font-mono">{stats.steps.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 uppercase">Estimated Steps</span>
                    </div>
                </div>

                {/* Menu */}
                <div className="space-y-3">
                    <div className="bg-gray-900/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Settings</span>
                            </div>
                            <span className="text-gray-500">→</span>
                        </button>

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
        </div>
    )
}
