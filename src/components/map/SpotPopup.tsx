'use client'

import { useState } from 'react'
import { X, MapPin, Award, CheckCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import CheckInButton from './CheckInButton'
import PhotoUpload from './PhotoUpload'
import CheckInSuccess from './CheckInSuccess'
import { useToast } from '@/context/ToastContext'

interface Badge {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  badge_type: string
  bonus_points: number
}

interface SpotPopupProps {
  spot: {
    id: string
    name: string
    description: string | null
    category_name: string | null
    category_color: string
    points: number
    radius: number
    visited: boolean
    visited_at: string | null
    coordinates: [number, number] // [lng, lat]
  }
  userLocation: [number, number] | null // [lng, lat]
  onClose: () => void
  onCheckInSuccess: () => void
  isOffline?: boolean
}

export default function SpotPopup({ spot, userLocation, onClose, onCheckInSuccess, isOffline = false }: SpotPopupProps) {
  const { showToast } = useToast()
  const [photo, setPhoto] = useState<string | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [checkInResult, setCheckInResult] = useState<{
    pointsEarned: number
    badgesEarned: Badge[]
  } | null>(null)
  const [checkInError, setCheckInError] = useState<string | null>(null)

  const handleCheckIn = async () => {
    if (!userLocation) {
      showToast('Please enable location services', 'error')
      return
    }

    if (isOffline) {
      showToast('You are offline. Please connect to the internet to check in.', 'error')
      return
    }

    setIsCheckingIn(true)
    setCheckInError(null)

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spot_id: spot.id,
          latitude: userLocation[1], // lat
          longitude: userLocation[0], // lng
          photo: photo
        })
      })

      const data = await response.json()

      if (!data.success) {
        // Handle error
        const errorMessage = data.error?.message || 'Check-in failed'
        setCheckInError(errorMessage)
        showToast(errorMessage, 'error')
        return
      }

      // Success!
      setCheckInResult({
        pointsEarned: data.points_earned || 0,
        badgesEarned: data.badges_earned || []
      })
      setShowSuccess(true)
      setCheckInError(null)
    } catch (error) {
      console.error('Check-in error:', error)
      const errorMessage = 'Network error. Please check your connection and try again.'
      setCheckInError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleRetry = () => {
    setCheckInError(null)
    handleCheckIn()
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    setCheckInResult(null)
    onCheckInSuccess()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Popup */}
        <div className="relative w-full sm:w-96 bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{spot.name}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Category Badge */}
          {spot.category_name && (
            <div className="flex items-center gap-2">
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: spot.category_color }}
              >
                {spot.category_name}
              </div>
            </div>
          )}

          {/* Description */}
          {spot.description && (
            <p className="text-gray-300 text-sm leading-relaxed">
              {spot.description}
            </p>
          )}

          {/* Points */}
          <div className="flex items-center gap-2 text-[#FC4C02]">
            <Award className="w-5 h-5" />
            <span className="font-bold text-lg">{spot.points} points</span>
          </div>

          {/* Visited Status */}
          {spot.visited ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Visited</span>
              </div>
              {spot.visited_at && (
                <p className="text-sm text-gray-400 ml-7">
                  {formatDistanceToNow(new Date(spot.visited_at), { addSuffix: true })}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Offline Warning */}
              {isOffline && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm text-center">
                    You are offline. Check-in requires internet connection.
                  </p>
                </div>
              )}

              {/* Error with Retry */}
              {checkInError && !isCheckingIn && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm mb-2">{checkInError}</p>
                  <button
                    onClick={handleRetry}
                    className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Check-in
                  </button>
                </div>
              )}

              {/* Photo Upload */}
              <PhotoUpload
                onPhotoSelect={setPhoto}
                disabled={isCheckingIn || isOffline}
              />

              {/* Check-in Button */}
              <CheckInButton
                spotId={spot.id}
                spotLocation={spot.coordinates}
                spotRadius={spot.radius}
                userLocation={userLocation}
                isVisited={spot.visited}
                onCheckIn={handleCheckIn}
                isLoading={isCheckingIn}
                disabled={isOffline}
              />
            </>
          )}
        </div>
      </div>
      </div>
      
      {/* Success Modal */}
      {checkInResult && (
        <CheckInSuccess
          isOpen={showSuccess}
          pointsEarned={checkInResult.pointsEarned}
          badgesEarned={checkInResult.badgesEarned}
          onClose={handleSuccessClose}
        />
      )}
    </>
  )
}
