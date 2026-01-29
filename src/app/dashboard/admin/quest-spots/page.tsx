'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SpotEditor from '@/components/admin/SpotEditor'
import AdminNav from '@/components/admin/AdminNav'
import { useToast } from '@/context/ToastContext'
import { MapPin, Edit2, Trash2, Plus, Eye, EyeOff } from 'lucide-react'

interface QuestSpot {
  id: string
  name: string
  description: string | null
  radius: number
  points: number
  is_active: boolean
  visit_count: number
  category: {
    id: string
    name: string
    color: string
  } | null
  created_at: string
}

export default function AdminQuestSpotsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [spots, setSpots] = useState<QuestSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSpot, setEditingSpot] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSpots = async () => {
    try {
      const res = await fetch('/api/admin/quest-spots')
      if (res.ok) {
        const data = await res.json()
        setSpots(data.spots || [])
      } else if (res.status === 401) {
        router.push('/tour')
      }
    } catch (error) {
      console.error('Error fetching spots:', error)
      showToast('Failed to load spots', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpots()
  }, [])

  const handleCreate = () => {
    setEditingSpot(null)
    setShowEditor(true)
  }

  const handleEdit = async (spot: QuestSpot) => {
    // Fetch full spot details including coordinates
    try {
      const res = await fetch(`/api/admin/quest-spots/${spot.id}`)
      if (res.ok) {
        const data = await res.json()
        setEditingSpot(data.spot)
        setShowEditor(true)
      }
    } catch (error) {
      console.error('Error fetching spot details:', error)
      showToast('Failed to load spot details', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this spot? Visit history will be preserved.')) {
      return
    }

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/quest-spots/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        showToast('Spot deleted successfully', 'success')
        fetchSpots()
      } else {
        throw new Error('Failed to delete spot')
      }
    } catch (error) {
      console.error('Delete error:', error)
      showToast('Failed to delete spot', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (spot: QuestSpot) => {
    try {
      const res = await fetch(`/api/admin/quest-spots/${spot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !spot.is_active })
      })

      if (res.ok) {
        showToast(`Spot ${!spot.is_active ? 'activated' : 'deactivated'}`, 'success')
        fetchSpots()
      } else {
        throw new Error('Failed to toggle spot')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      showToast('Failed to update spot', 'error')
    }
  }

  const handleSave = () => {
    setShowEditor(false)
    setEditingSpot(null)
    fetchSpots()
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingSpot(null)
  }

  if (showEditor) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <SpotEditor
          spot={editingSpot}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quest Spots</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage GPS-based quest locations
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Spot
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-gray-600">Loading spots...</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No quest spots yet</h3>
            <p className="text-gray-600 mb-6">Create your first quest spot to get started</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Spot
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {spots.map(spot => (
              <div
                key={spot.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{spot.name}</h3>
                      {spot.category && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: spot.category.color }}
                        >
                          {spot.category.name}
                        </span>
                      )}
                      {!spot.is_active && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {spot.description && (
                      <p className="text-gray-600 mb-3">{spot.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>Radius: {spot.radius}m</span>
                      </div>
                      <div>
                        <span className="font-semibold text-orange-600">{spot.points}</span> points
                      </div>
                      <div>
                        <span className="font-semibold">{spot.visit_count}</span> visits
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(spot)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title={spot.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {spot.is_active ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(spot)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(spot.id)}
                      disabled={deletingId === spot.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
