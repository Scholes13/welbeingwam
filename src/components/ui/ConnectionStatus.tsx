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
  showWhenOnline = false,
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
          role="status"
          aria-live="polite"
          className={`fixed top-3 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md ${
            isOnline
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          } ${className}`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline — perubahan akan dicoba ulang</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
