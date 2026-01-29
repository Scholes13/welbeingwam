'use client'

import { useSession } from '@/context/SessionContext'
import { Clock, Calendar } from 'lucide-react'

export default function SessionTimer() {
  const { session, status, remaining_seconds } = useSession()

  if (!session) {
    return null
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'upcoming':
        return 'bg-yellow-500'
      case 'ended':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Time Remaining'
      case 'upcoming':
        return 'Not Started'
      case 'ended':
        return 'Ended'
      default:
        return 'No Active Session'
    }
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'active' ? 'animate-pulse' : ''}`} />
        
        {/* Session Info */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-400">{getStatusText()}</div>
            {status === 'active' && (
              <div className="text-sm font-bold text-white">
                {formatTime(remaining_seconds)}
              </div>
            )}
            {status === 'upcoming' && (
              <div className="text-sm font-medium text-yellow-400">
                {formatTime(remaining_seconds)}
              </div>
            )}
            {status === 'ended' && (
              <div className="text-sm font-medium text-red-400">
                Session Complete
              </div>
            )}
          </div>
        </div>

        {/* Session Name */}
        <div className="hidden sm:flex items-center gap-2 border-l border-gray-700 pl-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white">{session.name}</span>
        </div>
      </div>
    </div>
  )
}
