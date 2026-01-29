'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface MapPickerProps {
  latitude: number
  longitude: number
  radius: number
  onLocationSelect: (lat: number, lng: number) => void
}

export default function MapPicker({
  latitude,
  longitude,
  radius,
  onLocationSelect
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Wait for map to load
    map.current.on('load', () => {
      setIsLoaded(true)
    })

    // Handle map clicks
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      onLocationSelect(lat, lng)
    })

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker when location changes
  useEffect(() => {
    if (!map.current) return

    const mapInstance = map.current

    // Update or create marker
    if (!marker.current) {
      marker.current = new mapboxgl.Marker({
        color: '#FC4C02',
        draggable: true
      })
        .setLngLat([longitude, latitude])
        .addTo(mapInstance)

      // Handle marker drag
      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat()
        onLocationSelect(lngLat.lat, lngLat.lng)
      })
    } else {
      marker.current.setLngLat([longitude, latitude])
    }

    // Center map on location
    mapInstance.flyTo({
      center: [longitude, latitude],
      zoom: 15
    })
  }, [latitude, longitude, onLocationSelect])

  // Update radius circle only after map is loaded
  useEffect(() => {
    if (!map.current || !isLoaded) return

    const mapInstance = map.current
    const circleId = 'radius-circle'
    const outlineId = 'radius-circle-outline'

    // Remove existing layers and source
    if (mapInstance.getLayer(outlineId)) {
      mapInstance.removeLayer(outlineId)
    }
    if (mapInstance.getLayer(circleId)) {
      mapInstance.removeLayer(circleId)
    }
    if (mapInstance.getSource(circleId)) {
      mapInstance.removeSource(circleId)
    }

    // Calculate circle points
    const points = 64
    const coords = []
    const distanceX = radius / (111320 * Math.cos(latitude * Math.PI / 180))
    const distanceY = radius / 110540

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI)
      const x = distanceX * Math.cos(theta)
      const y = distanceY * Math.sin(theta)
      coords.push([longitude + x, latitude + y])
    }
    coords.push(coords[0]) // Close the circle

    mapInstance.addSource(circleId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {}
      }
    })

    mapInstance.addLayer({
      id: circleId,
      type: 'fill',
      source: circleId,
      paint: {
        'fill-color': '#FC4C02',
        'fill-opacity': 0.2
      }
    })

    mapInstance.addLayer({
      id: outlineId,
      type: 'line',
      source: circleId,
      paint: {
        'line-color': '#FC4C02',
        'line-width': 2
      }
    })
  }, [latitude, longitude, radius, isLoaded])

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-96 rounded-lg border-2 border-gray-300 overflow-hidden"
    />
  )
}
