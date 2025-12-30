'use client'

import { useState } from 'react'

import { Loader2 } from 'lucide-react'

export default function ConnectStravaBtn() {
    const [loading, setLoading] = useState(false)

    const handleLogin = () => {
        window.location.href = '/api/auth/login'
    }

    return (
        <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#FC4C02] text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <svg
                    role="img"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    className="w-5 h-5"
                >
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
            )}
            Connect with Strava
        </button>
    )
}
