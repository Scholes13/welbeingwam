'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchJson } from '@/lib/fetch-json'
import type { AppSettings } from '@/lib/settings'

interface SettingsContextType {
  settings: AppSettings | null
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await fetchJson<{ settings: AppSettings }>('/api/settings')
      setSettings(data.settings ?? null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSettings(null)
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
