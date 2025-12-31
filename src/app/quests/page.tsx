'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Target } from 'lucide-react'
import { useQuests } from '@/hooks/use-swr-hooks'
import DailyQuests from '@/components/DailyQuests'

export default function QuestsPage() {
    const { quests, userQuests, isLoading, mutate } = useQuests()
    const router = useRouter()

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-yellow-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-8 p-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Target className="text-yellow-500" /> Daily Quests
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Complete quests to earn points and unlock rewards!
                    </p>
                </header>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading quests...</div>
                ) : (
                    <DailyQuests
                        quests={quests}
                        userQuests={userQuests}
                        onClaim={() => mutate()}
                        showAll={true}
                        includeCompleted={true}
                    />
                )}
            </div>
        </div>
    )
}
