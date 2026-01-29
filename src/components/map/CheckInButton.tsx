'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface CheckInButtonProps {
  spotId: string
  spotLocation: [number, number] // [lng, lat]
  spotRadius: number
  userLocation: [number, number] | null // [lng, lat]
  isVisited: boolean
  onCheckIn: () => void
  isLoading: boolean
  disabled?: boolean
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default function CheckInButton({
  spotLocation,
  spotRadius,
  userLocation,
  isVisited,
  onCheckIn,
  isLoading,
  disabled = false
}: CheckInButtonProps) {
  // Calculate distance and range status using useMemo to avoid setState in effect
  const { distance, isInRange } = useMemo(() => {
    if (!userLocation) {
      return { distance: null, isInRange: false }
    }

    const dist = calculateDistance(
      userLocation[1], // user lat
      userLocation[0], // user lng
      spotLocation[1], // spot lat
      spotLocation[0]  // spot lng
    )

    return {
      distance: Math.round(dist),
      isInRange: dist <= spotRadius
    }
  }, [userLocation, spotLocation, spotRadius])

  if (isVisited) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
        <p className="text-green-400 font-semibold">Already Checked In</p>
      </div>
    )
  }

  const canCheckIn = isInRange && !isLoading && !disabled && userLocation !== null

  return (
    <div className="space-y-3">
      {/* Distance indicator */}
      {distance !== null && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className={isInRange ? 'text-green-400' : 'text-gray-400'}>
            {distance < 1000 
              ? `${distance}m away`
              : `${(distance / 1000).toFixed(1)}km away`
            }
          </span>
        </div>
      )}

      {/* Check-in button */}
      <button
        onClick={onCheckIn}
        disabled={!canCheckIn}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-white
          transition-all duration-200
          flex items-center justify-center gap-2
          ${canCheckIn
            ? 'bg-[#FC4C02] hover:bg-[#E04402] active:scale-95'
            : 'bg-gray-700 cursor-not-allowed opacity-50'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking in...</span>
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5" />
            <span>
              {!userLocation
                ? 'Enable Location'
                : isInRange
                ? 'Check In Now'
                : `Get within ${spotRadius}m`
              }
            </span>
          </>
        )}
      </button>

      {/* Helper text */}
      {!userLocation && (
        <p className="text-xs text-gray-400 text-center">
          Please enable location services to check in
        </p>
      )}
      {userLocation && !isInRange && distance !== null && (
        <p className="text-xs text-gray-400 text-center">
          Move {distance - spotRadius}m closer to check in
        </p>
      )}
    </div>
  )
}
