'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddActivityBtn from '@/components/AddActivityBtn'
import DailyQuests from '@/components/DailyQuests'
import { Plus, Users, Award, Zap, Activity, Bell } from 'lucide-react'
export default function Dashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [activities, setActivities] = useState<any[]>([])
    const [quests, setQuests] = useState<any[]>([])
    const [userQuests, setUserQuests] = useState<any[]>([])
    const [surveys, setSurveys] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)
    const router = useRouter()

    useEffect(() => {
        fetchData()
        fetchUnreadCount()
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/notifications?count_only=true')
            const data = await res.json()
            if (typeof data.count === 'number') {
                setUnreadCount(data.count)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    const fetchData = async () => {
        try {
            const res = await fetch('/api/strava/sync')
            if (res.status === 401) {
                // If unauthorized, redirect to logout to clear cookies
                router.push('/api/auth/logout')
                return
            }

            const data = await res.json()
            if (data.profile) {
                setProfile(data.profile)
                setActivities(data.activities || [])
                setQuests(data.quests || [])
                setUserQuests(data.userQuests || [])
                setSurveys(data.surveys || [])
            }
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                Loading...
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pb-32">
            {profile && (
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img
                                src={profile.profile}
                                alt={profile.username}
                                className="w-20 h-20 rounded-full border-2 border-[#FC4C02]"
                            />
                            <div>
                                <h1 className="text-3xl font-bold">
                                    {profile.firstname} {profile.lastname}
                                </h1>
                                <p className="text-gray-400">@{profile.username}</p>
                                {profile.username === 'admin_wam' && (
                                    <button
                                        onClick={() => router.push('/dashboard/admin')}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-white mt-2 transition-colors flex items-center gap-1"
                                    >
                                        🛡️ Admin Panel
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/notifications')}
                            className="relative p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <Bell size={24} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-black">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Wellness Survey CTA */}
                    {/* Dynamic Surveys Section */}
                    {surveys.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {surveys.map((survey) => (
                                <div key={survey.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 backdrop-blur-xl group hover:border-[#FC4C02]/50 transition-colors">
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#FC4C02] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />

                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            {survey.title}
                                        </h2>
                                        <p className="text-gray-400 mb-6 line-clamp-2 min-h-[3rem]">
                                            {survey.description || 'Take this assessment to get personalized insights.'}
                                        </p>
                                        <button
                                            onClick={() => router.push(`/survey/${survey.id}`)}
                                            className="px-8 py-3 rounded-full bg-[#FC4C02] text-white font-bold hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(252,76,2,0.3)] hover:scale-105 whitespace-nowrap"
                                        >
                                            Start Assessment
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <DailyQuests
                        quests={quests}
                        userQuests={userQuests}
                        onClaim={fetchData}
                    />

                    <div className="grid gap-6">
                        <h2 className="text-2xl font-semibold border-b border-gray-800 pb-2">
                            Recent Activities
                        </h2>
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-gray-900 p-6 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-[#FC4C02]">
                                            {activity.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {new Date(activity.start_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                                        {activity.type}
                                    </span>
                                </div>
                                <div className="mt-4 flex gap-8">
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase">
                                            Distance
                                        </span>
                                        <span className="text-lg font-mono">
                                            {(activity.distance / 1000).toFixed(2)} km
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase">
                                            Time
                                        </span>
                                        <span className="text-lg font-mono">
                                            {Math.floor(activity.moving_time / 60)}m {activity.moving_time % 60}s
                                        </span>
                                    </div>
                                    {activity.steps > 0 && (
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase">
                                                Steps
                                            </span>
                                            <span className="text-lg font-mono">
                                                {activity.steps}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <AddActivityBtn />
        </div>
    )
}
