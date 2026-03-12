'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Instagram, Lock, Loader2, Activity, ExternalLink, Unplug } from 'lucide-react'
import Link from 'next/link'

import { getStravaAvatarState, getStravaConnectionState, getStravaFeedback } from './strava'

type ProfileResponse = {
    profile?: {
        avatar_url?: string | null
        manual_avatar_url?: string | null
        strava_avatar_url?: string | null
        strava_avatar_preview_url?: string | null
        avatar_source?: 'manual' | 'strava' | null
        avatar_preferences_supported?: boolean | null
        instagram_username?: string | null
        strava_athlete_id?: number | null
        is_strava_connected?: boolean | null
        last_strava_sync_at?: string | null
    }
}

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [stravaProfile, setStravaProfile] = useState<{
        avatar_url?: string | null
        manual_avatar_url?: string | null
        strava_avatar_url?: string | null
        strava_avatar_preview_url?: string | null
        avatar_source?: 'manual' | 'strava' | null
        avatar_preferences_supported?: boolean | null
        strava_athlete_id?: number | null
        is_strava_connected?: boolean | null
        last_strava_sync_at?: string | null
    }>({})

    const [formData, setFormData] = useState({
        instagram: '',
        password: '',
        confirmPassword: ''
    })

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/strava/sync')
                if (res.status === 401) {
                    router.push('/')
                    return
                }
                const data = await res.json() as ProfileResponse
                if (data.profile) {
                    const profile = data.profile
                    setFormData(prev => ({
                        ...prev,
                        instagram: profile.instagram_username || ''
                    }))
                    setStravaProfile({
                        avatar_url: profile.avatar_url,
                        manual_avatar_url: profile.manual_avatar_url,
                        strava_avatar_url: profile.strava_avatar_url,
                        strava_avatar_preview_url: profile.strava_avatar_preview_url,
                        avatar_source: profile.avatar_source,
                        avatar_preferences_supported: profile.avatar_preferences_supported,
                        strava_athlete_id: profile.strava_athlete_id,
                        is_strava_connected: profile.is_strava_connected,
                        last_strava_sync_at: profile.last_strava_sync_at,
                    })
                }
            } catch (err) {
                console.error('Error fetching profile:', err)
            } finally {
                setLoading(false)
            }
        }

        void fetchProfile()
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setSaving(true)

        // Validation
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setSaving(false)
            return
        }

        try {
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instagram: formData.instagram,
                    password: formData.password || undefined // Only send if set
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update settings')
            }

            setMessage('Settings updated successfully!')
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })) // Clear password fields

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update settings')
        } finally {
            setSaving(false)
        }
    }

    const handleDisconnectStrava = async () => {
        setError('')
        setMessage('')
        setDisconnecting(true)

        try {
            const res = await fetch('/api/strava/disconnect', {
                method: 'POST',
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to disconnect Strava')
            }

            setStravaProfile({
                ...stravaProfile,
                avatar_url: stravaProfile.avatar_source === 'strava'
                    ? (stravaProfile.manual_avatar_url ?? stravaProfile.avatar_url ?? null)
                    : stravaProfile.avatar_url,
                strava_avatar_url: null,
                strava_avatar_preview_url: null,
                avatar_source: 'manual',
                strava_athlete_id: null,
                is_strava_connected: false,
                last_strava_sync_at: null,
            })
            setMessage('Akun Strava berhasil dilepas.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect Strava')
        } finally {
            setDisconnecting(false)
        }
    }

    const handleUseAvatarSource = async (source: 'manual' | 'strava') => {
        setError('')
        setMessage('')

        try {
            const res = await fetch('/api/user/avatar-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update avatar source')
            }

            setStravaProfile(prev => ({
                ...prev,
                avatar_source: source,
                avatar_url:
                    source === 'strava'
                        ? (prev.strava_avatar_url ?? prev.avatar_url ?? null)
                        : (prev.manual_avatar_url ?? prev.avatar_url ?? null),
            }))
            setMessage(source === 'strava' ? 'Avatar Strava dipakai sebagai avatar utama.' : 'Avatar app lama dipakai lagi sebagai avatar utama.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update avatar source')
        }
    }

    const stravaState = getStravaConnectionState(stravaProfile)
    const stravaAvatarState = getStravaAvatarState(stravaProfile)
    const stravaFeedback = getStravaFeedback({
        strava: searchParams.get('strava'),
        error: searchParams.get('error'),
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <Loader2 className="w-8 h-8 animate-spin text-[#FC4C02]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-32">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-blue-900 rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/profile" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {stravaFeedback && (
                        <div
                            className={`px-4 py-3 rounded-xl text-sm border ${
                                stravaFeedback.tone === 'success'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                        >
                            {stravaFeedback.message}
                        </div>
                    )}

                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#FC4C02]/10 rounded-lg text-[#FC4C02]">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Strava</h2>
                                    <p className="text-xs text-gray-400">Hubungkan Strava untuk sync sport session otomatis</p>
                                </div>
                            </div>

                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                    stravaState.isConnected
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-white/5 text-gray-300 border border-white/10'
                                }`}
                            >
                                {stravaState.statusLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className={`rounded-2xl border p-4 ${stravaProfile.avatar_source === 'manual' ? 'border-[#FC4C02]/40 bg-[#FC4C02]/10' : 'border-white/10 bg-black/40'}`}>
                                <p className="text-xs font-semibold uppercase text-gray-400 mb-3">App Avatar</p>
                                <img
                                    src={stravaProfile.manual_avatar_url || stravaProfile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                                    alt="App avatar"
                                    className="w-20 h-20 rounded-full object-cover border border-white/10 mb-3"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleUseAvatarSource('manual')}
                                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/5 transition-colors"
                                >
                                    Use App Avatar
                                </button>
                            </div>

                            <div className={`rounded-2xl border p-4 ${stravaProfile.avatar_source === 'strava' ? 'border-[#FC4C02]/40 bg-[#FC4C02]/10' : 'border-white/10 bg-black/40'}`}>
                                <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Strava Avatar</p>
                                <img
                                    src={stravaAvatarState.imageUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=strava'}
                                    alt="Strava avatar"
                                    className="w-20 h-20 rounded-full object-cover border border-white/10 mb-3"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleUseAvatarSource('strava')}
                                    disabled={!stravaAvatarState.canUseStravaAvatar}
                                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Use Strava Avatar
                                </button>
                                {stravaAvatarState.helperText && (
                                    <p className="mt-2 text-[11px] leading-4 text-gray-500">
                                        {stravaAvatarState.helperText}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 mb-5">
                            <p className="text-sm text-gray-200">{stravaState.helperText}</p>
                            {stravaState.athleteLabel && (
                                <p className="text-xs text-gray-400">{stravaState.athleteLabel}</p>
                            )}
                            {stravaState.lastSyncLabel && (
                                <p className="text-xs text-gray-500">{stravaState.lastSyncLabel}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <a
                                href="/api/auth/login"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#FC4C02]/30 bg-[#FC4C02] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#ff5d1f]"
                            >
                                {stravaState.buttonLabel}
                                <ExternalLink className="w-4 h-4" />
                            </a>

                            {stravaState.isConnected && (
                                <button
                                    type="button"
                                    onClick={handleDisconnectStrava}
                                    disabled={disconnecting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {disconnecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Disconnecting...
                                        </>
                                    ) : (
                                        <>
                                            Disconnect Strava
                                            <Unplug className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Instagram Section */}
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                                <Instagram className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Social Media</h2>
                                <p className="text-xs text-gray-400">Add your Instagram to connect with others</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Instagram Username</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                                <input
                                    type="text"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02] transition-colors"
                                    placeholder="username"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Security</h2>
                                <p className="text-xs text-gray-400">Update your password</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">New Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#FC4C02] transition-colors"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">Confirm Password</label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#FC4C02] transition-colors"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-xl text-sm text-center">
                            {message}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-[#FC4C02] hover:bg-[#ff5d1f] text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
