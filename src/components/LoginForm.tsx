'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { resolveLoginCredentials } from '@/lib/auth/login'

export default function LoginForm() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')

        const formData = new FormData(e.currentTarget)
        const credentials = resolveLoginCredentials(formData, { username, password })

        if (!credentials.username || !credentials.password) {
            setError('Username and password are required')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/auth/standard-login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            })

            if (res.ok) {
                router.push('/dashboard')
            } else {
                const data = await res.json()
                setError(data.error || 'Login failed')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative z-10 w-full max-w-sm">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 mb-2">
                    WLM
                </h1>
                <p className="text-gray-400 font-light tracking-wide">
                    Balance Within. Impact Beyond.
                </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-[#FC4C02] transition-colors" />
                    <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02] focus:bg-white/10 transition-all font-medium"
                    />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-[#FC4C02] transition-colors" />
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02] focus:bg-white/10 transition-all font-medium"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-red-400 text-xs font-medium">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FC4C02] hover:bg-[#e04402] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(252,76,2,0.3)] hover:shadow-[0_0_30px_rgba(252,76,2,0.5)] flex items-center justify-center gap-2 group"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Login Account
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-600">
                Forgot password? Contact Super Admin.
            </p>
        </div>
    )
}
