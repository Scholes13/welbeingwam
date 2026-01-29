'use client'

import { useEffect, useRef } from 'react'
import { Trophy, MapPin, Award } from 'lucide-react'

interface LeaderboardEntry {
  id: string
  code: string
  name: string
  profile_photo_url: string | null
  total_points: number
  spots_visited: number
  badge_count: number
  last_checkin: string | null
  rank: number
}

interface LeaderboardListProps {
  entries: LeaderboardEntry[]
  currentParticipantId?: string | null
}

export default function LeaderboardList({ entries, currentParticipantId }: LeaderboardListProps) {
  const currentUserRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current user on mount
  useEffect(() => {
    if (currentUserRef.current && currentParticipantId) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 300)
    }
  }, [currentParticipantId])

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No participants yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isCurrentUser = entry.id === currentParticipantId
        const isTopThree = entry.rank <= 3

        return (
          <div
            key={entry.id}
            ref={isCurrentUser ? currentUserRef : null}
            className={`relative flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md transition-all ${
              isCurrentUser
                ? 'bg-gradient-to-r from-[#FC4C02]/20 to-transparent border-[#FC4C02] shadow-[0_0_20px_rgba(252,76,2,0.3)] scale-[1.02] ring-2 ring-[#FC4C02]/50'
                : entry.rank === 1
                ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                : entry.rank === 2
                ? 'bg-gradient-to-r from-gray-300/10 to-transparent border-gray-300/50'
                : entry.rank === 3
                ? 'bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/50'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            {/* Rank Badge */}
            <div
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center font-bold text-lg rounded-full ${
                entry.rank === 1
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : entry.rank === 2
                  ? 'bg-gray-300/20 text-gray-300'
                  : entry.rank === 3
                  ? 'bg-orange-700/20 text-orange-700'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {entry.rank === 1 ? '👑' : entry.rank}
            </div>

            {/* Profile Photo */}
            <img
              src={entry.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.code}`}
              alt={entry.name}
              className="w-14 h-14 rounded-full border-2 border-white/10 object-cover"
            />

            {/* Participant Info */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">
                  {entry.name}
                </h3>
                {isCurrentUser && (
                  <span className="text-xs bg-[#FC4C02] text-white px-2 py-0.5 rounded-full font-bold">
                    YOU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {entry.spots_visited} spots
                </span>
                {entry.badge_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {entry.badge_count} badges
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <span
                className={`text-2xl font-mono font-bold block ${
                  isTopThree ? 'text-[#FC4C02]' : 'text-white'
                }`}
              >
                {entry.total_points.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">points</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
