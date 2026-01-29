'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import SpotPopup from './SpotPopup'
import CategoryFilter from './CategoryFilter'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import ConnectionStatus from '../ui/ConnectionStatus'

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Category {
  id: string
  name: string
  color: string
}

interface SpotFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    id: string
    name: string
    description: string | null
    category_id: string | null
    category_name: string | null
    category_icon: string | null
    category_color: string
    points: number
    radius: number
    visited: boolean
    visited_at: string | null
  }
}

interface SpotsGeoJSON {
  type: 'FeatureCollection'
  features: SpotFeature[]
}

interface TourMapProps {
  className?: string
  categoryFilterEnabled?: boolean
}

export default function TourMap({
  className = '',
  categoryFilterEnabled = true
}: TourMapProps) {
  const { isOnline } = useConnectionStatus()
  const [selectedSpot, setSelectedSpot] = useState<SpotFeature['properties'] | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [spots, setSpots] = useState<SpotsGeoJSON | null>(null)
  const [cachedSpots, setCachedSpots] = useState<SpotsGeoJSON | null>(null)
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  // Fetch spots data
  const fetchSpots = async () => {
    if (!isOnline) {
      // Use cached data when offline
      if (cachedSpots) {
        setSpots(cachedSpots)
      }
      return
    }

    try {
      const res = await fetch('/api/spots')
      if (res.ok) {
        const data = await res.json()
        setSpots(data)
        // Cache the data for offline use
        setCachedSpots(data)
        // Store in localStorage for persistence
        try {
          localStorage.setItem('cached_spots', JSON.stringify(data))
        } catch (e) {
          console.error('Failed to cache spots:', e)
        }
      }
    } catch (error) {
      console.error('Error fetching spots:', error)
      // Use cached data on error
      if (cachedSpots) {
        setSpots(cachedSpots)
      }
    }
  }

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      if (!isOnline) return

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        const res = await fetch(`${supabaseUrl}/rest/v1/categories?select=id,name,color&order=sort_order`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
          setSelectedCategoryIds(data.map((c: Category) => c.id))
          // Cache categories
          try {
            localStorage.setItem('cached_categories', JSON.stringify(data))
          } catch (e) {
            console.error('Failed to cache categories:', e)
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        // Try to load from cache
        try {
          const cached = localStorage.getItem('cached_categories')
          if (cached) {
            const data = JSON.parse(cached)
            setCategories(data)
            setSelectedCategoryIds(data.map((c: Category) => c.id))
          }
        } catch (e) {
          console.error('Failed to load cached categories:', e)
        }
      }
    }
    fetchCategories()
  }, [isOnline])

  // Fetch spots data
  useEffect(() => {
    // Load cached data on mount
    try {
      const cached = localStorage.getItem('cached_spots')
      if (cached) {
        const data = JSON.parse(cached)
        // Only set cached spots, don't trigger re-render loop
        if (!cachedSpots) {
          setCachedSpots(data)
        }
        if (!isOnline && !spots) {
          setSpots(data)
        }
      }
    } catch (e) {
      console.error('Failed to load cached spots:', e)
    }

    if (isOnline) {
      fetchSpots()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [115.2126, -8.6705], // Bali default
      zoom: 13,
      // Enable local tile caching for offline support
      localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif"
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Handle map load
    map.current.on('load', () => {
      setIsLoaded(true)
    })

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Track user location
  useEffect(() => {
    if (!map.current || !isLoaded) return

    const mapInstance = map.current

    // Create pulsing dot element
    const pulsingDot = document.createElement('div')
    pulsingDot.className = 'user-location-marker'
    pulsingDot.innerHTML = `
      <style>
        .user-location-marker {
          width: 20px;
          height: 20px;
          position: relative;
        }
        .user-location-marker::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .user-location-marker::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
      </style>
    `

    // Watch user position
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { longitude, latitude } = position.coords

          // Update state for SpotPopup
          setUserLocation([longitude, latitude])

          if (!userLocationMarker.current) {
            // Create marker
            userLocationMarker.current = new mapboxgl.Marker({
              element: pulsingDot
            })
              .setLngLat([longitude, latitude])
              .addTo(mapInstance)
          } else {
            // Update marker position
            userLocationMarker.current.setLngLat([longitude, latitude])
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
        if (userLocationMarker.current) {
          userLocationMarker.current.remove()
          userLocationMarker.current = null
        }
      }
    }
  }, [isLoaded])

  // Add spots layer when map is loaded and spots are fetched
  useEffect(() => {
    if (!map.current || !isLoaded || !spots) return

    const mapInstance = map.current

    // Add spots source
    if (!mapInstance.getSource('spots')) {
      mapInstance.addSource('spots', {
        type: 'geojson',
        data: spots
      })

      // Add symbol layer for unvisited spots
      mapInstance.addLayer({
        id: 'spots-unvisited',
        type: 'circle',
        source: 'spots',
        filter: ['!', ['get', 'visited']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'category_color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Add symbol layer for visited spots
      mapInstance.addLayer({
        id: 'spots-visited',
        type: 'circle',
        source: 'spots',
        filter: ['get', 'visited'],
        paint: {
          'circle-radius': 12,
          'circle-color': '#10b981', // green for visited
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.7
        }
      })

      // Add labels
      mapInstance.addLayer({
        id: 'spots-labels',
        type: 'symbol',
        source: 'spots',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })

      // Fit bounds to show all spots
      if (spots.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        spots.features.forEach(feature => {
          bounds.extend(feature.geometry.coordinates as [number, number])
        })
        mapInstance.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        })
      }

      // Handle spot clicks
      mapInstance.on('click', 'spots-unvisited', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties
          if (properties) {
            setSelectedSpot(properties as SpotFeature['properties'])
          }
        }
      })

      mapInstance.on('click', 'spots-visited', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties
          if (properties) {
            setSelectedSpot(properties as SpotFeature['properties'])
          }
        }
      })

      // Change cursor on hover
      mapInstance.on('mouseenter', 'spots-unvisited', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })
      mapInstance.on('mouseleave', 'spots-unvisited', () => {
        mapInstance.getCanvas().style.cursor = ''
      })
      mapInstance.on('mouseenter', 'spots-visited', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })
      mapInstance.on('mouseleave', 'spots-visited', () => {
        mapInstance.getCanvas().style.cursor = ''
      })
    } else {
      // Update existing source
      const source = mapInstance.getSource('spots') as mapboxgl.GeoJSONSource
      source.setData(spots)
    }
  }, [isLoaded, spots])

  // Apply category filter
  useEffect(() => {
    if (!map.current || !isLoaded) return

    const mapInstance = map.current

    if (mapInstance.getLayer('spots-unvisited') && mapInstance.getLayer('spots-visited')) {
      // Create filter expression
      const filter = selectedCategoryIds.length > 0
        ? ['in', ['get', 'category_id'], ['literal', selectedCategoryIds]]
        : ['==', ['get', 'category_id'], ''] // Show nothing if no categories selected

      mapInstance.setFilter('spots-unvisited', ['all', ['!', ['get', 'visited']], filter])
      mapInstance.setFilter('spots-visited', ['all', ['get', 'visited'], filter])
      mapInstance.setFilter('spots-labels', filter)
    }
  }, [isLoaded, selectedCategoryIds])

  const handleFilterChange = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds)
  }

  const handleCheckInSuccess = () => {
    // Refresh spots data to update visited status
    fetchSpots()
  }

  // Get selected spot with coordinates
  const selectedSpotWithCoords = selectedSpot
    ? {
        ...selectedSpot,
        coordinates: spots?.features.find(f => f.properties.id === selectedSpot.id)?.geometry.coordinates as [number, number] || [0, 0]
      }
    : null

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <ConnectionStatus />
        </div>
      )}
      
      {/* Category Filter */}
      {categoryFilterEnabled && categories.length > 0 && (
        <div className="absolute bottom-24 left-4 z-10">
          <CategoryFilter 
            categories={categories}
            onFilterChange={handleFilterChange}
            enabled={categoryFilterEnabled}
          />
        </div>
      )}
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white">Loading map...</div>
        </div>
      )}
      
      {/* Spot Popup */}
      {selectedSpotWithCoords && (
        <SpotPopup 
          spot={selectedSpotWithCoords}
          userLocation={userLocation}
          onClose={() => setSelectedSpot(null)}
          onCheckInSuccess={handleCheckInSuccess}
          isOffline={!isOnline}
        />
      )}
    </div>
  )
}
