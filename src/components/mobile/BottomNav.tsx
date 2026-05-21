'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User, Gift, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { useOverlayState } from '@/context/OverlayContext'

export default function BottomNav() {
    const pathname = usePathname()
    const { isActive: overlayActive } = useOverlayState()

    const links = [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/quests', label: 'Quests', icon: Target },
        { href: '/rewards', label: 'Rewards', icon: Gift },
        { href: '/leaderboard', label: 'Rank', icon: Trophy },
        { href: '/profile', label: 'Profile', icon: User },
    ]

    // Don't show on login page, survey, doorprize, admin dashboard, or while a fullscreen overlay is active.
    if (
        pathname === '/' ||
        pathname?.startsWith('/survey') ||
        pathname?.startsWith('/doorprize') ||
        pathname === '/dashboard/admin' ||
        overlayActive
    ) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
            <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/[0.06]">
                <div className="mx-auto max-w-lg flex justify-around items-center px-2 pt-2 pb-3">
                    {links.map((link) => {
                        const isActive = pathname === link.href

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="relative flex flex-col items-center gap-0.5 py-1 px-3"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#FC4C02]"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <link.icon
                                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                                        isActive ? 'text-[#FC4C02]' : 'text-gray-600 hover:text-gray-400'
                                    }`}
                                />
                                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                                    isActive ? 'text-white' : 'text-gray-600'
                                }`}>
                                    {link.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
