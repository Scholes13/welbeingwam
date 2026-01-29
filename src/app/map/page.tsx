'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TourMap from '@/components/map/TourMap'
import ConnectionStatus from '@/components/ui/ConnectionStatus'
import SessionTimer from '@/components/ui/SessionTimer'
import Loader from '@/components/ui/Loader'
import { useSettings } from '@/context/SettingsContext'

interface Participant {
  id: string
  code: string
  name: string
  profile_photo_url: string
  total_points: number
  is_admin: boolean
}

export default function MapPage() {
  const router = useRouter()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/tour/auth/me')
        if (res.ok) {
          const data = await res.json()
          setParticipant(data.participant)
        } else {
          router.push('/')
        }
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader />
      </div>
    )
  }

  if (!participant) {
    return null
  }

  // Check if category filter is enabled from settings
  const categoryFilterEnabled = settings?.features.category_filter !== false

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-start justify-between gap-4">
        {/* Connection Status */}
        <ConnectionStatus />

        {/* Session Timer */}
        <div className="flex-1 flex justify-center">
          <SessionTimer />
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
          <img
            src={participant.profile_photo_url}
            alt={participant.name}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-white text-sm font-medium hidden sm:inline">
            {participant.name}
          </span>
          <span className="text-[#FC4C02] text-sm font-bold">
            {participant.total_points} pts
          </span>
        </div>
      </div>

      {/* Map - Full screen */}
      <TourMap categoryFilterEnabled={categoryFilterEnabled} />
    </div>
  )
}
