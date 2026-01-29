'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Plus, Edit, Trash2, Loader2, X, Save } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import { useToast } from '@/context/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'

interface TourSession {
  id: string
  name: string
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export default function AdminSessionsPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [sessions, setSessions] = useState<TourSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    is_active: true
  })

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch('/api/tour/auth/me')
      if (authRes.ok) {
        const authData = await authRes.json()
        if (!authData.participant?.is_admin) {
          router.push('/map')
          return
        }
      } else {
        router.push('/tour')
        return
      }

      await fetchSessions()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/tour')
    }
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      } else {
        toastError('Failed to load sessions')
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toastError('Error loading sessions')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (session: TourSession) => {
    setIsEditing(true)
    setEditingId(session.id)
    setFormData({
      name: session.name,
      start_time: new Date(session.start_time).toISOString().slice(0, 16),
      end_time: new Date(session.end_time).toISOString().slice(0, 16),
      is_active: session.is_active
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = '/api/admin/sessions'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing
        ? { id: editingId, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        success(isEditing ? 'Session updated!' : 'Session created!')
        setIsModalOpen(false)
        fetchSessions()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to save session')
      }
    } catch (error) {
      console.error('Error saving session:', error)
      toastError('Error saving session')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return
    }

    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/sessions?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        success('Session deleted!')
        fetchSessions()
      } else {
        toastError('Failed to delete session')
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      toastError('Error deleting session')
    } finally {
      setIsDeleting(null)
    }
  }

  const getSessionStatus = (session: TourSession) => {
    const now = new Date()
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)

    if (!session.is_active) {
      return { label: 'Inactive', color: 'bg-gray-500' }
    }

    if (now < start) {
      return { label: 'Upcoming', color: 'bg-blue-500' }
    } else if (now >= start && now <= end) {
      return { label: 'Active', color: 'bg-green-500' }
    } else {
      return { label: 'Ended', color: 'bg-red-500' }
    }
  }

  const getRemainingTime = (session: TourSession) => {
    const now = new Date()
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)

    if (now < start) {
      const diff = start.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `Starts in ${hours}h ${minutes}m`
    } else if (now >= start && now <= end) {
      const diff = end.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m remaining`
    } else {
      return 'Ended'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
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
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tour Sessions</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage tour session timing and availability
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Session
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Create your first tour session to get started</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const status = getSessionStatus(session)
              return (
                <div key={session.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{session.name}</h3>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(session)}
                          className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          disabled={isDeleting === session.id}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          {isDeleting === session.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{getRemainingTime(session)}</span>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-sm">
                          <p className="text-gray-500 mb-1">Start</p>
                          <p className="font-medium text-gray-900">
                            {new Date(session.start_time).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-sm">
                          <p className="text-gray-500 mb-1">End</p>
                          <p className="font-medium text-gray-900">
                            {new Date(session.end_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Edit Session' : 'Create Session'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., City Tour 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active Session
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {isEditing ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
