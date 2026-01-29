'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Trophy, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface Badge {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  badge_type: string
  bonus_points: number
}

interface CheckInSuccessProps {
  isOpen: boolean
  pointsEarned: number
  badgesEarned: Badge[]
  onClose: () => void
}

export default function CheckInSuccess({
  isOpen,
  pointsEarned,
  badgesEarned,
  onClose
}: CheckInSuccessProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti celebration
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Success Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Content */}
            <div className="p-8 text-center space-y-6">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Award className="w-10 h-10 text-green-400" />
                </div>
              </motion.div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Check-in Successful!
                </h2>
                <p className="text-gray-400 text-sm">
                  Great job exploring the city
                </p>
              </div>

              {/* Points Earned */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-[#FC4C02]/10 border border-[#FC4C02]/30 rounded-xl p-6"
              >
                <div className="flex items-center justify-center gap-3">
                  <Award className="w-8 h-8 text-[#FC4C02]" />
                  <div className="text-left">
                    <p className="text-sm text-gray-400">Points Earned</p>
                    <p className="text-3xl font-bold text-[#FC4C02]">
                      +{pointsEarned}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Badges Earned */}
              {badgesEarned.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Trophy className="w-5 h-5" />
                    <h3 className="font-bold">New Badge{badgesEarned.length > 1 ? 's' : ''} Unlocked!</h3>
                  </div>

                  <div className="space-y-2">
                    {badgesEarned.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          {badge.icon_url ? (
                            <img
                              src={badge.icon_url}
                              alt={badge.name}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-yellow-400" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-white">{badge.name}</h4>
                            {badge.description && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {badge.description}
                              </p>
                            )}
                            {badge.bonus_points > 0 && (
                              <p className="text-xs text-yellow-400 mt-1">
                                +{badge.bonus_points} bonus points
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Continue Button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full py-3 bg-[#FC4C02] hover:bg-[#E04402] text-white font-semibold rounded-lg transition-colors"
              >
                Continue Exploring
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
