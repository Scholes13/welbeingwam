'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile, useNotifications } from '@/hooks/use-swr-hooks'
import AddActivityBtn from '@/components/AddActivityBtn'
import DailyQuests from '@/components/DailyQuests'
import { Plus, Users, Award, Zap, Activity, Bell, Footprints, Trophy, Heart, Brain, Sparkles, Briefcase } from 'lucide-react'

import Link from 'next/link'
import Loader from '@/components/ui/Loader'

interface Dimension {
    id: string
    name: string
    display_name: string
    icon: string
    sort_order: number
}

const dimensionIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    users: Users,
    sparkles: Sparkles,
    briefcase: Briefcase,
}

interface Survey {
    id: string
    title: string
    description?: string
}

interface Activity {
    id: string
    type: string
    name: string
    start_date: string
    steps: number
}

export default function Dashboard() {
    const { profile, activities, quests, userQuests, surveys, isLoading: profileLoading, mutate: mutateProfile } = useProfile()
    const { unreadCount } = useNotifications()
    const router = useRouter()

    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [dimensionPoints, setDimensionPoints] = useState<Record<string, number>>({})

    const handleRefresh = () => {
        mutateProfile()
    }

    // Fetch dimensions
    useEffect(() => {
        fetch('/api/dimensions')
            .then(r => r.json())
            .then(d => setDimensions(d.dimensions || []))
            .catch(() => {})
    }, [])

    // Fetch user's dimension points from leaderboard
    useEffect(() => {
        if (!profile) return
        fetch('/api/leaderboard')
            .then(r => r.json())
            .then(data => {
                const me = (data.leaderboard || []).find((e: any) => e.user_id === profile.id)
                if (me?.dimension_points) {
                    setDimensionPoints(me.dimension_points)
                }
            })
            .catch(() => {})
    }, [profile])

    if (profileLoading && !profile) {
        return <Loader text="LOADING DASHBOARD..." />
    }

    return (
        <div className="h-[100dvh] overflow-y-auto bg-black text-white pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {profile && (
                <div className="max-w-4xl mx-auto space-y-8 px-8 pt-8">
                    <div className="sticky top-0 z-50 flex items-center justify-between bg-black/80 backdrop-blur-xl -mx-8 px-8 py-4 -mt-8 mb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <img
                                src={profile.profile}
                                alt={profile.username}
                                className="w-16 h-16 rounded-full border-2 border-[#FC4C02]"
                            />
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {profile.firstname} {profile.lastname}
                                </h1>
                                <p className="text-gray-400 text-sm">@{profile.username}</p>
                                {profile.username === 'admin_wam' && (
                                    <button
                                        onClick={() => router.push('/dashboard/admin')}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-white mt-1 transition-colors flex items-center gap-1"
                                    >
                                        🛡️ Admin
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
                            {surveys.map((survey: Survey) => (
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
                        onClaim={handleRefresh}
                    />

                    {/* Life Mode Progress — 6 Dimensions */}
                    {dimensions.length > 0 && (
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Life Mode Progress</h3>
                            <div className="space-y-3">
                                {dimensions.map(dim => {
                                    const points = dimensionPoints[dim.id] || 0
                                    const maxPoints = Math.max(
                                        100,
                                        ...Object.values(dimensionPoints).filter(v => v > 0)
                                    )
                                    const percent = maxPoints > 0 ? Math.min((points / maxPoints) * 100, 100) : 0
                                    const IconComp = dimensionIconMap[dim.icon] || Activity

                                    return (
                                        <div key={dim.id} className="flex items-center gap-3">
                                            <IconComp className="text-[#FC4C02] flex-shrink-0" size={16} />
                                            <span className="text-xs text-gray-400 w-28 truncate">{dim.display_name}</span>
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#FC4C02] to-orange-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${percent}%`, opacity: 0.4 + (percent / 100) * 0.6 }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 w-14 text-right font-mono">{points} pts</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6">
                        <h2 className="text-2xl font-semibold border-b border-gray-800 pb-2">
                            Recent Activities
                        </h2>
                        {activities.map((activity: Activity) => (
                            <div
                                key={activity.id}
                                className="bg-gray-900 p-6 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800 flex items-center justify-between"
                            >
                                <div>
                                    <h3 className={`text-xl font-bold mb-1 ${activity.type === 'Event' ? 'text-yellow-500' : 'text-[#FC4C02]'}`}>
                                        {activity.name}
                                    </h3>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span>{new Date(activity.start_date).toLocaleDateString()}</span>
                                        <span className="bg-gray-800 px-2 py-0.5 rounded text-xs border border-gray-700">
                                            {activity.type}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`flex items-center gap-2 ${activity.type === 'Event' ? 'text-yellow-500' : 'text-[#FC4C02]'}`}>
                                        {activity.type === 'Event' ? <Trophy size={20} /> : <Footprints size={20} />}
                                        <span className="text-2xl font-mono font-bold">
                                            {activity.steps > 0 ? activity.steps.toLocaleString() : '-'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 uppercase tracking-widest block mt-1">
                                        {activity.type === 'Event' ? 'Points' : 'Steps'}
                                    </span>
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
