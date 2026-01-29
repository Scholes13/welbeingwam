'use client'

import { Award, Trophy, Zap, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Badge {
  id: string
  badge_id: string
  name: string
  description: string | null
  icon_url: string | null
  badge_type: 'category_streak' | 'speed_demon' | 'completion'
  bonus_points: number
  category_name?: string
  category_color?: string
  earned_at: string
}

interface BadgeGalleryProps {
  badges: Badge[]
  isEnabled: boolean
}

const getBadgeIcon = (badgeType: string) => {
  switch (badgeType) {
    case 'speed_demon':
      return <Zap className="w-6 h-6" />
    case 'completion':
      return <CheckCircle className="w-6 h-6" />
    case 'category_streak':
      return <Trophy className="w-6 h-6" />
    default:
      return <Award className="w-6 h-6" />
  }
}

const getBadgeColor = (badgeType: string, categoryColor?: string) => {
  if (badgeType === 'category_streak' && categoryColor) {
    return categoryColor
  }
  switch (badgeType) {
    case 'speed_demon':
      return '#fbbf24' // yellow-400
    case 'completion':
      return '#10b981' // green-500
    default:
      return '#FC4C02'
  }
}

export default function BadgeGallery({ badges, isEnabled }: BadgeGalleryProps) {
  // Don't render if feature is disabled
  if (!isEnabled) {
    return null
  }

  // Don't render if no badges
  if (badges.length === 0) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-800/50 rounded-full">
            <Award className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-400 mb-2">No Badges Yet</h3>
        <p className="text-sm text-gray-500">
          Complete challenges to earn badges and bonus points!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FC4C02]" />
          Earned Badges
        </h2>
        <span className="text-sm text-gray-500 font-mono">
          {badges.length} {badges.length === 1 ? 'badge' : 'badges'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {badges.map((badge) => {
          const badgeColor = getBadgeColor(badge.badge_type, badge.category_color)
          
          return (
            <div
              key={badge.id}
              className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center hover:border-white/20 transition-colors"
            >
              {/* Badge Icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg"
                style={{
                  backgroundColor: `${badgeColor}20`,
                  color: badgeColor,
                  boxShadow: `0 0 20px ${badgeColor}40`,
                }}
              >
                {badge.icon_url ? (
                  <img
                    src={badge.icon_url}
                    alt={badge.name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  getBadgeIcon(badge.badge_type)
                )}
              </div>

              {/* Badge Name */}
              <h3 className="font-bold text-sm mb-1 line-clamp-2">
                {badge.name}
              </h3>

              {/* Category Name (for category_streak badges) */}
              {badge.badge_type === 'category_streak' && badge.category_name && (
                <p className="text-xs text-gray-500 mb-2">
                  {badge.category_name}
                </p>
              )}

              {/* Bonus Points */}
              {badge.bonus_points > 0 && (
                <div className="flex items-center gap-1 text-xs font-mono text-yellow-500 mb-2">
                  <span>+{badge.bonus_points}</span>
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" className="fill-yellow-500" />
                    <path d="M12 6V18M12 6C14 6 15 7 15 9C15 11 13.5 12 12 12M12 6C10.5 6 9 7 9 9C9 10 9.5 11 11 11.5M12 18C10.5 18 9 17 9 15C9 13 10.5 12 12 12M12 18C13.5 18 15 17 15 15C15 14 14.5 13 13 12.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Earned Date */}
              <p className="text-xs text-gray-600 font-mono">
                {format(new Date(badge.earned_at), 'MMM d, HH:mm')}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
