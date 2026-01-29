'use client'

import { useState, useRef } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'

interface PhotoUploadProps {
  onPhotoSelect: (photo: string | null) => void
  disabled?: boolean
}

/**
 * Compress image to reduce file size
 * Returns base64 encoded JPEG
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to JPEG with compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function PhotoUpload({ onPhotoSelect, disabled = false }: PhotoUploadProps) {
  const { settings } = useSettings()
  const [preview, setPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Don't render if photo_checkin feature is disabled
  if (!settings?.features.photo_checkin) {
    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }

    try {
      setIsProcessing(true)
      
      // Compress image
      const compressedBase64 = await compressImage(file)
      
      setPreview(compressedBase64)
      onPhotoSelect(compressedBase64)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Failed to process image. Please try another photo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onPhotoSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Photo (Optional)
        </label>
        {settings?.photo_bonus_points && (
          <span className="text-xs text-[#FC4C02] font-semibold">
            +{settings.photo_bonus_points} pts
          </span>
        )}
      </div>

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-700">
          <img
            src={preview}
            alt="Check-in photo preview"
            className="w-full h-48 object-cover"
          />
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isProcessing}
          className={`
            w-full h-32 border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center gap-2
            transition-colors
            ${disabled || isProcessing
              ? 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-50'
              : 'border-gray-600 bg-gray-800/30 hover:border-[#FC4C02] hover:bg-gray-800/50 cursor-pointer'
            }
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-8 h-8 border-2 border-[#FC4C02] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Processing...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-gray-400" />
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">
                Tap to add photo
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <p className="text-xs text-gray-500 text-center">
        Add a photo to earn bonus points
      </p>
    </div>
  )
}
