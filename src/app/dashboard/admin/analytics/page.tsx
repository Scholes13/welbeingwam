'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MapPin, CheckCircle, TrendingUp, Award, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import AdminNav from '@/components/admin/AdminNav'

interface AnalyticsData {
  summary: {
    total_participants: number
    total_check_ins: number
    total_spots: number
  }
  top_spots: Array<{
    id: string
    name: string
    points: number
    visit_count: number
    category: {
      name: string
      color: string
    } | null
  }>
  recent_check_ins: Array<{
    id: string
    points_earned: number
    checked_in_at: string
    participant: {
      id: string
      name: string
      profile_photo_url: string | null
    }
    spot: {
      id: string
      name: string
    }
  }>
  top_participants: Array<{
    id: string
    name: string
    profile_photo_url: string | null
    total_points: number
    spots_visited: number
    badge_count: number
  }>
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) {
        const analyticsData = await res.json()
        setData(analyticsData)
      } else if (res.status === 401) {
        router.push('/tour')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()

    // Subscribe to real-time updates
    const visitsChannel = supabase
      .channel('analytics-visits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits'
        },
        () => {
          fetchAnalytics()
        }
      )
      .subscribe()

    const badgesChannel = supabase
      .channel('analytics-badges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participant_badges'
        },
        () => {
          fetchAnalytics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(visitsChannel)
      supabase.removeChannel(badgesChannel)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time tour statistics and insights
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Participants</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data.summary.total_participants}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Check-ins</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data.summary.total_check_ins}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Spots</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data.summary.total_spots}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Spots */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Top Spots</h2>
              </div>
            </div>
            <div className="p-6">
              {data.top_spots.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No spots visited yet</p>
              ) : (
                <div className="space-y-4">
                  {data.top_spots.map((spot, index) => (
                    <div key={spot.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-bold text-gray-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{spot.name}</p>
                          {spot.category && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: spot.category.color }}
                            >
                              {spot.category.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{spot.points} points</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-orange-600">{spot.visit_count}</p>
                        <p className="text-xs text-gray-500">visits</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Participants */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Top Participants</h2>
              </div>
            </div>
            <div className="p-6">
              {data.top_participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No participants yet</p>
              ) : (
                <div className="space-y-4">
                  {data.top_participants.map((participant, index) => (
                    <div key={participant.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-bold text-gray-600">
                        {index + 1}
                      </div>
                      <div className="flex-shrink-0">
                        {participant.profile_photo_url ? (
                          <img
                            src={participant.profile_photo_url}
                            alt={participant.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{participant.name}</p>
                        <p className="text-sm text-gray-500">
                          {participant.spots_visited} spots • {participant.badge_count} badges
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-orange-600">{participant.total_points}</p>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Check-ins */}
          <div className="bg-white rounded-lg shadow lg:col-span-2">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Recent Check-ins</h2>
              </div>
            </div>
            <div className="p-6">
              {data.recent_check_ins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No check-ins yet</p>
              ) : (
                <div className="space-y-4">
                  {data.recent_check_ins.map((checkin) => (
                    <div key={checkin.id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-shrink-0">
                        {checkin.participant.profile_photo_url ? (
                          <img
                            src={checkin.participant.profile_photo_url}
                            alt={checkin.participant.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{checkin.participant.name}</span>
                          {' checked in at '}
                          <span className="font-semibold">{checkin.spot.name}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(checkin.checked_in_at).toLocaleString()} • +{checkin.points_earned} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
