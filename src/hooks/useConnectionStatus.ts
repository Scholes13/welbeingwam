'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ConnectionStatus {
  isOnline: boolean
  lastSync: Date | null
}

export function useConnectionStatus(): ConnectionStatus {
  // Initialize with actual browser state to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine
    }
    return true
  })
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      return new Date()
    }
    return null
  })

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastSync(new Date())
      
      // Auto-reconnect Supabase Realtime channels
      reconnectRealtimeChannels()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, lastSync }
}

/**
 * Reconnect all Supabase Realtime channels after connection restore
 */
function reconnectRealtimeChannels() {
  try {
    // Get all channels
    const channels = supabase.getChannels()
    
    // Unsubscribe and resubscribe each channel
    channels.forEach(channel => {
      const channelName = channel.topic
      
      // Remove the channel
      supabase.removeChannel(channel)
      
      // Recreate the channel based on its name
      if (channelName.includes('leaderboard-visits')) {
        const newChannel = supabase
          .channel('leaderboard-visits')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'visits'
            },
            () => {
              // Trigger will be handled by the component
            }
          )
          .subscribe()
      } else if (channelName.includes('leaderboard-badges')) {
        const newChannel = supabase
          .channel('leaderboard-badges')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'participant_badges'
            },
            () => {
              // Trigger will be handled by the component
            }
          )
          .subscribe()
      }
    })
    
    console.log('Realtime channels reconnected')
  } catch (error) {
    console.error('Error reconnecting Realtime channels:', error)
  }
}
