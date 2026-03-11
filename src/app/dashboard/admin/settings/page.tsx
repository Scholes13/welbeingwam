'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings as SettingsIcon, Loader2 } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import SettingsPanel from '@/components/admin/SettingsPanel'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'

function AdminSettingsPageContent() {
  const router = useRouter()
  const { settings, isLoading, refreshSettings } = useSettings()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/tour/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.participant?.is_admin) {
            setIsAuthorized(true)
          } else {
            router.push('/map')
          }
        } else {
          router.push('/tour')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/tour')
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || !settings) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure point values and feature toggles
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SettingsPanel 
          initialSettings={settings} 
          onSave={refreshSettings}
        />
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <SettingsProvider>
      <AdminSettingsPageContent />
    </SettingsProvider>
  )
}
