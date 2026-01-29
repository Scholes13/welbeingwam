'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Plus, Edit, Trash2, Loader2, X, Save, Upload, Image as ImageIcon } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import { useToast } from '@/context/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  icon_url: string | null
  color: string
  sort_order: number
  created_at: string
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    icon_url: '',
    color: '#FC4C02',
    sort_order: 0
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

      await fetchCategories()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/tour')
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      } else {
        toastError('Failed to load categories')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toastError('Error loading categories')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      name: '',
      icon_url: '',
      color: '#FC4C02',
      sort_order: categories.length
    })
    setIsModalOpen(true)
  }

  const openEditModal = (category: Category) => {
    setIsEditing(true)
    setEditingId(category.id)
    setFormData({
      name: category.name,
      icon_url: category.icon_url || '',
      color: category.color,
      sort_order: category.sort_order
    })
    setIsModalOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]

    if (file.size > 2 * 1024 * 1024) {
      toastError('File size exceeds 2MB limit')
      return
    }

    try {
      setIsUploading(true)
      const fileName = `category-icon-${Date.now()}-${file.name}`

      const { data, error } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('checkin-photos')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, icon_url: publicUrl }))
      success('Icon uploaded successfully')
    } catch (error: any) {
      console.error('Upload error:', error)
      toastError(error.message || 'Failed to upload icon')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = '/api/admin/categories'
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
        success(isEditing ? 'Category updated!' : 'Category created!')
        setIsModalOpen(false)
        fetchCategories()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to save category')
      }
    } catch (error) {
      console.error('Error saving category:', error)
      toastError('Error saving category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will fail if any quest spots use this category.')) {
      return
    }

    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        success('Category deleted!')
        fetchCategories()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toastError('Error deleting category')
    } finally {
      setIsDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading categories...</p>
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
              <Tag className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage quest spot categories with custom icons and colors
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-6">Create your first category to organize quest spots</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Category
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Icon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.sort_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category.icon_url ? (
                        <img
                          src={category.icon_url}
                          alt={category.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-600">{category.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={isDeleting === category.id}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          {isDeleting === category.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    {isEditing ? 'Edit Category' : 'Create Category'}
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
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Historical, Culinary, Art"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.icon_url ? (
                      <img
                        src={formData.icon_url}
                        alt="Icon preview"
                        className="w-16 h-16 object-contain border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading...' : 'Upload Icon'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">Max 2MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="#FC4C02"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Lower numbers appear first
                  </p>
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
