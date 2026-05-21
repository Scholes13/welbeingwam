'use client'

import React from 'react'
import RewardsSection from '@/components/RewardsSection'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RewardsPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[80px] opacity-15" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <header className="mb-8 p-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FC4C02] to-orange-500 bg-clip-text text-transparent">
                        Rewards
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Redeem your points for exclusive rewards!
                    </p>
                </header>

                <RewardsSection />
            </div>
        </div>
    )
}
