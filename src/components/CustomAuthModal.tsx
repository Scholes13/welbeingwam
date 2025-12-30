'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Lock, AlertCircle } from 'lucide-react'

export default function CustomAuthModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<'access_code' | 'byok'>('access_code')

    // BYOK State
    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')

    // Manual State
    const [accessCode, setAccessCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleConnectBYOK = () => {
        if (!clientId || !clientSecret) return
        window.location.href = `/api/auth/login?custom_id=${clientId}&custom_secret=${clientSecret}`
    }

    const handleConnectManual = async () => {
        if (!accessCode) return
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/manual-login', {
                method: 'POST',
                body: JSON.stringify({ accessCode }),
            })

            if (res.ok) {
                window.location.href = '/dashboard'
            } else {
                const data = await res.json()
                setError(data.error || 'Login failed')
            }
        } catch (e) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs text-gray-600 hover:text-white transition-colors underline decoration-dotted"
            >
                Login Options (Manual / Developer)
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold mb-6 text-center">Login Options</h3>

                            {/* Tabs */}
                            <div className="flex bg-black/50 p-1 rounded-xl mb-6">
                                <button
                                    onClick={() => setMode('access_code')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'access_code' ? 'bg-[#FC4C02] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Access Code
                                </button>
                                <button
                                    onClick={() => setMode('byok')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'byok' ? 'bg-[#FC4C02] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Developer Key
                                </button>
                            </div>

                            {mode === 'access_code' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400 text-center mb-2">
                                        Enter the specific code provided by your admin.
                                    </p>
                                    <div>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                            <input
                                                type="text"
                                                value={accessCode}
                                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                                placeholder="e.g. WAM-2025"
                                                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02] tracking-widest text-center font-mono text-lg uppercase"
                                            />
                                        </div>
                                    </div>

                                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                                    <button
                                        onClick={handleConnectManual}
                                        disabled={!accessCode || loading}
                                        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Verifying...' : 'Login'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400 text-center mb-2">
                                        Bypass the "Single User Limit" by using your own Strava API credentials.
                                    </p>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Client ID</label>
                                        <input
                                            type="text"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Client Secret</label>
                                        <input
                                            type="password"
                                            value={clientSecret}
                                            onChange={(e) => setClientSecret(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>

                                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex gap-2 items-start">
                                        <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-500/80">
                                            Ensure your App's "Authorization Callback Domain" is set to <code>localhost</code>.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleConnectBYOK}
                                        disabled={!clientId || !clientSecret}
                                        className="w-full bg-[#FC4C02] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                                    >
                                        Login with Custom Key
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
