'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface TourSession {
  id: string
  name: string
  start_time: string
  end_time: string
  is_active: boolean
}

type SessionStatus = 'upcoming' | 'active' | 'ended' | 'none'

interface SessionContextType {
  session: TourSession | null
  status: SessionStatus
  remaining_seconds: number
  isLoading: boolean
  error: string | null
  refreshSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TourSession | null>(null)
  const [status, setStatus] = useState<SessionStatus>('none')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calculateStatus = useCallback((sess: TourSession | null): SessionStatus => {
    if (!sess) return 'none'

    const now = new Date()
    const start = new Date(sess.start_time)
    const end = new Date(sess.end_time)

    if (now < start) return 'upcoming'
    if (now > end) return 'ended'
    return 'active'
  }, [])

  const calculateRemainingSeconds = useCallback((sess: TourSession | null): number => {
    if (!sess) return 0

    const now = new Date()
    const start = new Date(sess.start_time)
    const end = new Date(sess.end_time)

    if (now < start) {
      // Time until start
      return Math.floor((start.getTime() - now.getTime()) / 1000)
    } else if (now <= end) {
      // Time until end
      return Math.floor((end.getTime() - now.getTime()) / 1000)
    }

    return 0
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/session')
      
      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }

      const data = await response.json()
      const sess = data.session || null

      setSession(sess)
      setStatus(calculateStatus(sess))
      setRemainingSeconds(calculateRemainingSeconds(sess))
    } catch (err) {
      console.error('Error fetching session:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSession(null)
      setStatus('none')
      setRemainingSeconds(0)
    } finally {
      setIsLoading(false)
    }
  }, [calculateStatus, calculateRemainingSeconds])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Update countdown every second
  useEffect(() => {
    if (!session || status === 'none' || status === 'ended') return

    const interval = setInterval(() => {
      const newStatus = calculateStatus(session)
      const newRemaining = calculateRemainingSeconds(session)

      setStatus(newStatus)
      setRemainingSeconds(newRemaining)

      // If status changed to ended, clear interval
      if (newStatus === 'ended') {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session, status, calculateStatus, calculateRemainingSeconds])

  const refreshSession = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

  return (
    <SessionContext.Provider
      value={{
        session,
        status,
        remaining_seconds: remainingSeconds,
        isLoading,
        error,
        refreshSession
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
