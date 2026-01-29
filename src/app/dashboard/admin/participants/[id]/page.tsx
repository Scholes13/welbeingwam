'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Award, Calendar, Image as ImageIcon, Users } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import Link from 'next/link'

interface ParticipantData {
  participant: {
    id: string
    code: string
    name: string
    profile_photo_url: string | null
    total_points: number
    is_admin: boolean
    created_at: string
    stats: {
      total_spots: number
      total_points: number
      total_badges: number
    }
  }
  visits: Array<{
    id: string
    points_earned: number
    photo_url: string | null
    checked_in_at: string
    spot: {
      id: string
      name: string
      description: string | null
      points: number
      category: {
        name: string
        color: string
      } | null
    }
  }>
  badges: Array<{
    id: string
    earned_at: string
    badge: {
      id: string
      name: string
      description: string | null
      icon_url: string | null
      badge_type: string
      bonus_points: number
    }
  }>
}

export default function ParticipantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const participantId = params.id as string

  const [data, setData] = useState<ParticipantData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchParticipant() {
      try {
        const res = await fetch(`/api/admin/participants/${participantId}`)
        if (res.ok) {
          const participantData = await res.json()
          setData(participantData)
        } else if (res.status === 401) {
          router.push('/tour')
        } else if (res.status === 404) {
          router.push('/dashboard/admin')
        }
      } catch (error) {
        console.error('Error fetching participant:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParticipant()
  }, [participantId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading participant...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Participant not found</p>
      </div>
    )
  }

  const { participant, visits, badges } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/dashboard/admin/analytics"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analytics
          </Link>
          
          <div className="flex items-start gap-6">
            {participant.profile_photo_url ? (
              <img
                src={participant.profile_photo_url}
                alt={participant.name}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                <Users className="w-12 h-12 text-gray-600" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{participant.name}</h1>
              <p className="text-gray-600 mt-1">Code: {participant.code}</p>
              <p className="text-sm text-gray-500 mt-1">
                Joined {new Date(participant.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Points</p>
                <p className="text-3xl font-bold text-orange-600">
                  {participant.stats.total_points}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Award className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Spots Visited</p>
                <p className="text-3xl font-bold text-gray-900">
                  {participant.stats.total_spots}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Badges Earned</p>
                <p className="text-3xl font-bold text-gray-900">
                  {participant.stats.total_badges}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Visit Timeline */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Visit Timeline</h2>
            </div>
            <div className="p-6">
              {visits.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No visits yet</p>
              ) : (
                <div className="space-y-6">
                  {visits.map((visit) => (
                    <div key={visit.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{visit.spot.name}</h3>
                            {visit.spot.category && (
                              <span
                                className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: visit.spot.category.color }}
                              >
                                {visit.spot.category.name}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600">+{visit.points_earned}</p>
                            <p className="text-xs text-gray-500">points</p>
                          </div>
                        </div>
                        
                        {visit.spot.description && (
                          <p className="text-sm text-gray-600 mb-2">{visit.spot.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(visit.checked_in_at).toLocaleString()}
                          </div>
                          {visit.photo_url && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-4 h-4" />
                              <a
                                href={visit.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View photo
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Badges</h2>
            </div>
            <div className="p-6">
              {badges.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No badges earned yet</p>
              ) : (
                <div className="space-y-4">
                  {badges.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        {item.badge.icon_url ? (
                          <img
                            src={item.badge.icon_url}
                            alt={item.badge.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <Award className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{item.badge.name}</h3>
                        {item.badge.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.badge.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Earned {new Date(item.earned_at).toLocaleDateString()}
                        </p>
                        {item.badge.bonus_points > 0 && (
                          <p className="text-xs text-orange-600 font-semibold mt-1">
                            +{item.badge.bonus_points} bonus points
                          </p>
                        )}
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
