'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

interface CompletionCelebrationProps {
  isOpen: boolean
  onClose: () => void
  participantName: string
  totalPoints: number
  spotsVisited: number
}

export default function CompletionCelebration({
  isOpen,
  onClose,
  participantName,
  totalPoints,
  spotsVisited
}: CompletionCelebrationProps) {
  
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        
        // Fire confetti from two sides
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border-2 border-[#FC4C02] overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#FC4C02]/20 to-yellow-500/20 rounded-full blur-3xl"
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 180, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
              />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="mb-6 flex justify-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                  <Trophy className="w-24 h-24 text-yellow-500 relative z-10" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-white mb-2"
              >
                🎉 Congratulations! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-300 mb-6"
              >
                {participantName}, you've completed the tour!
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-black/30 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-[#FC4C02] mb-1">
                      {spotsVisited}
                    </div>
                    <div className="text-sm text-gray-400">Spots Visited</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-500 mb-1">
                      {totalPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Total Points</div>
                  </div>
                </div>
              </motion.div>

              {/* Completion Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="bg-gradient-to-r from-[#FC4C02] to-yellow-500 rounded-2xl p-4 mb-6"
              >
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-6 h-6 text-white" />
                  <span className="text-lg font-bold text-white">
                    Tour Master Badge Unlocked!
                  </span>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-gray-400 text-sm"
              >
                You've explored every spot in the city tour. Amazing work! 🌟
              </motion.p>

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                className="mt-6 w-full py-3 bg-[#FC4C02] hover:bg-[#E04402] text-white font-bold rounded-xl transition-colors"
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
