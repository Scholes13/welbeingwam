'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User, Gift, Target } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BottomNav() {
    const pathname = usePathname()

    const links = [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/quests', label: 'Quests', icon: Target },
        { href: '/rewards', label: 'Rewards', icon: Gift },
        { href: '/leaderboard', label: 'Rank', icon: Trophy },
        { href: '/profile', label: 'Profile', icon: User },
    ]

    // Don't show on login page or survey
    if (pathname === '/' || pathname?.startsWith('/survey')) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
            <div className="mx-auto max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-6 py-3 flex justify-between items-center">
                {links.map((link) => {
                    const isActive = pathname === link.href

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="relative flex flex-col items-center gap-1 min-w-[50px] md:min-w-[64px]"
                        >


                            <div className="relative">
                                <link.icon
                                    className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-[#FC4C02]' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                />
                            </div>
                            <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-600'
                                }`}>
                                {link.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
