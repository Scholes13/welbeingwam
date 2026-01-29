'use client'

import { useState, useEffect } from 'react'
import MapPicker from './MapPicker'
import { useToast } from '@/context/ToastContext'

interface Category {
  id: string
  name: string
  icon_url: string | null
  color: string
}

interface SpotEditorProps {
  spot?: {
    id: string
    name: string
    description: string | null
    latitude: number
    longitude: number
    radius: number
    points: number
    category_id: string | null
    is_active: boolean
  }
  onSave: () => void
  onCancel: () => void
}

export default function SpotEditor({ spot, onSave, onCancel }: SpotEditorProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  
  // Form state
  const [name, setName] = useState(spot?.name || '')
  const [description, setDescription] = useState(spot?.description || '')
  const [latitude, setLatitude] = useState(spot?.latitude || -8.6705)
  const [longitude, setLongitude] = useState(spot?.longitude || 115.2126)
  const [radius, setRadius] = useState(spot?.radius || 50)
  const [points, setPoints] = useState(spot?.points || 50)
  const [categoryId, setCategoryId] = useState(spot?.category_id || '')
  const [isActive, setIsActive] = useState(spot?.is_active ?? true)

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        const res = await fetch(`${supabaseUrl}/rest/v1/categories?select=*&order=sort_order`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    if (!name.trim()) {
      showToast('Please enter a spot name', 'error')
      return
    }
    
    if (radius < 20 || radius > 500) {
      showToast('Radius must be between 20 and 500 meters', 'error')
      return
    }

    setLoading(true)

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        latitude,
        longitude,
        radius,
        points,
        category_id: categoryId || null,
        is_active: isActive
      }

      const url = spot 
        ? `/api/admin/quest-spots/${spot.id}`
        : '/api/admin/quest-spots'
      
      const method = spot ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save spot')
      }

      showToast(spot ? 'Spot updated successfully' : 'Spot created successfully', 'success')
      onSave()
    } catch (error) {
      console.error('Save spot error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to save spot', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {spot ? 'Edit Quest Spot' : 'Create Quest Spot'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Map Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location (Click on map to select)
          </label>
          <MapPicker
            latitude={latitude}
            longitude={longitude}
            radius={radius}
            onLocationSelect={handleLocationSelect}
          />
          <div className="mt-2 text-sm text-gray-600">
            Selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Spot Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., Ubud Palace"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Brief description of the spot..."
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">No Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Radius and Points */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-2">
              Check-in Radius (m) *
            </label>
            <input
              type="number"
              id="radius"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value) || 50)}
              min={20}
              max={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Min: 20m, Max: 500m</p>
          </div>

          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
              Base Points *
            </label>
            <input
              type="number"
              id="points"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 50)}
              min={0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Active Status */}
        {spot && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active (visible to participants)
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : spot ? 'Update Spot' : 'Create Spot'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
