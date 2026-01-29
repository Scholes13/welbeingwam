'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

interface OnlineParticipant {
  participant_id: string
  name: string
  profile_photo_url: string | null
  total_points: number
  lng: number
  lat: number
  last_seen: string
}

interface TourMapProps {
  className?: string
  categoryFilterEnabled?: boolean
  currentParticipantId?: string
}

export default function TourMap({
  className = '',
  categoryFilterEnabled = true,
  currentParticipantId
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
  const [onlineParticipants, setOnlineParticipants] = useState<OnlineParticipant[]>([])
  const participantMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map())

  // Update own location to server
  const updateMyLocation = useCallback(async (lng: number, lat: number) => {
    if (!isOnline) return
    try {
      await fetch('/api/tour/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      })
    } catch (error) {
      console.error('Failed to update location:', error)
    }
  }, [isOnline])

  // Fetch online participants
  const fetchOnlineParticipants = useCallback(async () => {
    if (!isOnline) return
    try {
      const res = await fetch('/api/tour/location')
      if (res.ok) {
        const data = await res.json()
        setOnlineParticipants(data.participants || [])
      }
    } catch (error) {
      console.error('Failed to fetch online participants:', error)
    }
  }, [isOnline])

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
      style: 'mapbox://styles/mapbox/streets-v12', // Colorful street map
      center: [110.3897, -7.7567], // Condongcatur, Jogja
      zoom: 15,
      attributionControl: true
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Handle map load
    map.current.on('load', () => {
      setIsLoaded(true)
      // Trigger resize to ensure map fills container
      setTimeout(() => {
        map.current?.resize()
      }, 100)
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

  // Update own location to server and fetch other participants
  useEffect(() => {
    if (!isLoaded || !isOnline) return

    // Update own location when it changes
    if (userLocation) {
      updateMyLocation(userLocation[0], userLocation[1])
    }

    // Fetch online participants periodically
    fetchOnlineParticipants()
    const interval = setInterval(fetchOnlineParticipants, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [isLoaded, isOnline, userLocation, updateMyLocation, fetchOnlineParticipants])

  // Render participant markers on map
  useEffect(() => {
    if (!map.current || !isLoaded) return

    const mapInstance = map.current

    // Track which participants are still online
    const currentParticipantIds = new Set(onlineParticipants.map(p => p.participant_id))

    // Remove markers for participants who went offline
    participantMarkers.current.forEach((marker, participantId) => {
      if (!currentParticipantIds.has(participantId)) {
        marker.remove()
        participantMarkers.current.delete(participantId)
      }
    })

    // Add or update markers for online participants
    onlineParticipants.forEach(participant => {
      // Skip current user (they have their own blue dot)
      if (participant.participant_id === currentParticipantId) return

      const existingMarker = participantMarkers.current.get(participant.participant_id)

      if (existingMarker) {
        // Update position
        existingMarker.setLngLat([participant.lng, participant.lat])
      } else {
        // Create new marker with avatar
        const el = document.createElement('div')
        el.className = 'participant-marker'
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid #10b981;
            overflow: hidden;
            background: #1f2937;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <img 
              src="${participant.profile_photo_url || '/default-avatar.png'}" 
              alt="${participant.name}"
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.src='/default-avatar.png'"
            />
          </div>
          <div style="
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            white-space: nowrap;
          ">
            ${participant.name}
          </div>
        `
        el.style.position = 'relative'

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([participant.lng, participant.lat])
          .addTo(mapInstance)

        participantMarkers.current.set(participant.participant_id, marker)
      }
    })
  }, [isLoaded, onlineParticipants, currentParticipantId])

  const handleFilterChange = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds)
  }

  const handleCheckInSuccess = () => {
    // Refresh spots data to update visited status
    fetchSpots()
  }

  // Center map on user location
  const handleLocateMe = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 16,
        duration: 1000
      })
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          setUserLocation([longitude, latitude])
          if (map.current) {
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              duration: 1000
            })
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Tidak bisa mendapatkan lokasi. Pastikan GPS diaktifkan dan izin lokasi diberikan.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  // Get selected spot with coordinates
  const selectedSpotWithCoords = selectedSpot
    ? {
        ...selectedSpot,
        coordinates: spots?.features.find(f => f.properties.id === selectedSpot.id)?.geometry.coordinates as [number, number] || [0, 0]
      }
    : null

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <ConnectionStatus />
        </div>
      )}
      
      {/* Category Filter - Collapsible */}
      {categoryFilterEnabled && categories.length > 0 && (
        <div className="absolute bottom-24 left-4 z-10 max-h-[40vh] overflow-y-auto">
          <CategoryFilter 
            categories={categories}
            onFilterChange={handleFilterChange}
            enabled={categoryFilterEnabled}
          />
        </div>
      )}

      {/* Locate Me Button */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-24 right-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
        title="Lokasi Saya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
        </svg>
      </button>

      {/* User Location Indicator */}
      {userLocation && (
        <div className="absolute bottom-36 right-4 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
          📍 {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
        </div>
      )}

      {/* Online Participants Counter */}
      {onlineParticipants.length > 0 && (
        <div className="absolute top-20 left-4 z-10 bg-green-600 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          {onlineParticipants.length} online
        </div>
      )}
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-30">
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
