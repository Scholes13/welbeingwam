'use client'

import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConnectionStatusProps {
  className?: string
  showWhenOnline?: boolean
}

export default function ConnectionStatus({ 
  className = '', 
  showWhenOnline = false 
}: ConnectionStatusProps) {
  const { isOnline } = useConnectionStatus()

  // Only show when offline, unless showWhenOnline is true
  if (isOnline && !showWhenOnline) {
    return null
  }

  return (
    <AnimatePresence>
      {(!isOnline || showWhenOnline) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          } ${className}`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Offline</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
