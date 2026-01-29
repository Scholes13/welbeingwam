'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, ArrowRight, Loader2, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

export default function TourLoginForm() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/tour/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          gender: gender || undefined 
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/map')
      } else {
        setError(data.error?.message || 'Registration failed')
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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FC4C02] to-[#e04402] rounded-2xl flex items-center justify-center shadow-lg">
            <MapPin className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-2">
          City Tour
        </h1>
        <p className="text-gray-400 font-light tracking-wide">
          Explore • Check-in • Win
        </p>
      </motion.div>

      {/* Registration Form */}
      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleRegister} 
        className="space-y-4"
      >
        {/* Name Input */}
        <div className="relative group">
          <User className="absolute left-4 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-[#FC4C02] transition-colors" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            maxLength={50}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FC4C02] focus:bg-white/10 transition-all font-medium"
          />
        </div>

        {/* Gender Selection */}
        <div className="space-y-2">
          <p className="text-gray-500 text-sm pl-1">Gender (for avatar style)</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`flex-1 py-3 rounded-xl border transition-all font-medium ${
                gender === 'male'
                  ? 'bg-[#FC4C02]/20 border-[#FC4C02] text-[#FC4C02]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              👨 Male
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`flex-1 py-3 rounded-xl border transition-all font-medium ${
                gender === 'female'
                  ? 'bg-[#FC4C02]/20 border-[#FC4C02] text-[#FC4C02]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              👩 Female
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
          >
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!name.trim() || name.trim().length < 2 || loading}
          className="w-full bg-[#FC4C02] hover:bg-[#e04402] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(252,76,2,0.3)] hover:shadow-[0_0_30px_rgba(252,76,2,0.5)] flex items-center justify-center gap-2 group"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Start Exploring
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </motion.form>

      <p className="mt-8 text-center text-xs text-gray-600">
        By joining, you agree to participate in the city tour event.
      </p>
    </div>
  )
}
