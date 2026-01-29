'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface Settings {
  base_checkin_points: number
  photo_bonus_points: number
  category_streak_bonus: number
  speed_demon_bonus: number
  features: {
    qr_checkin: boolean
    gps_checkin: boolean
    photo_checkin: boolean
    badges: boolean
    leaderboard: boolean
    rewards: boolean
    surveys: boolean
    category_filter: boolean
  }
}

interface SettingsContextType {
  settings: Settings | null
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const defaultSettings: Settings = {
  base_checkin_points: 50,
  photo_bonus_points: 50,
  category_streak_bonus: 200,
  speed_demon_bonus: 300,
  features: {
    qr_checkin: true,
    gps_checkin: true,
    photo_checkin: true,
    badges: true,
    leaderboard: true,
    rewards: true,
    surveys: true,
    category_filter: true
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/settings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data.settings || defaultSettings)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Use default settings on error
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const refreshSettings = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider value={{ settings, isLoading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
