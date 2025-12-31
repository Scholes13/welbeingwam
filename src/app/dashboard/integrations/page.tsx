'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Check, Smartphone, Link as LinkIcon, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function IntegrationsPage() {
    const [loading, setLoading] = useState(true)
    const [syncKey, setSyncKey] = useState('')
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const fetchKey = async () => {
            try {
                const res = await fetch('/api/integrations/get-key')
                const data = await res.json()
                if (data.sync_key) {
                    setSyncKey(data.sync_key)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchKey()
    }, [])

    const handleCopy = () => {
        navigator.clipboard.writeText(syncKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Dashboard
            </button>

            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                        <Smartphone className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Apple Health & iOS Shortcuts</h1>
                        <p className="text-gray-400">Sync your iPhone steps automatically, for free.</p>
                    </div>
                </div>

                {/* Secret Key Section */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FC4C02] rounded-full blur-[60px] opacity-10" />

                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[#FC4C02]" />
                        Your Secret Sync Key
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                        This key is used by the Shortcut to identify you. Keep it private.
                    </p>

                    <div className="flex gap-2">
                        <div className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-center text tracking-wider text-gray-300">
                            {loading ? 'Loading...' : syncKey}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="bg-[#FC4C02] hover:bg-orange-600 text-white px-6 rounded-xl font-bold transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">How to Setup</h3>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                        <div>
                            <h4 className="font-bold mb-1">Copy your Sync Key</h4>
                            <p className="text-gray-400 text-sm">Click the copy button above to grab your unique key.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                        <div>
                            <h4 className="font-bold mb-1">Install the WAM25 Shortcut</h4>
                            <p className="text-gray-400 text-sm mb-2">Click the link below to add the shortcut to your iPhone.</p>
                            <a
                                href="https://www.icloud.com/shortcuts/example" // Placeholder
                                target="_blank"
                                className="inline-flex items-center gap-2 text-[#FC4C02] hover:text-orange-500 underline decoration-dotted"
                            >
                                <LinkIcon size={16} />
                                Download Shortcut Template
                            </a>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                        <div>
                            <h4 className="font-bold mb-1">Paste Key & Automate</h4>
                            <p className="text-gray-400 text-sm">
                                Open the Shortcut settings, paste your Secret Key.<br />
                                Then go to "Automation" tab &rarr; Create Personal Automation &rarr; Time of Day (e.g. 23:00) &rarr; Run Shortcut "WAM25 Sync".
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
