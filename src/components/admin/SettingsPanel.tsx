'use client'

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface SettingsPanelProps {
  initialSettings: {
    base_checkin_points: number
    photo_bonus_points: number
    category_streak_bonus: number
    speed_demon_bonus: number
    features: {
      qr_checkin: boolean
      gps_checkin: boolean
      photo_checkin: boolean
      badges: boolean
      leaderboard: boolean
      rewards: boolean
      surveys: boolean
      category_filter: boolean
    }
  }
  onSave: () => void
}

export default function SettingsPanel({ initialSettings, onSave }: SettingsPanelProps) {
  const { success, error: toastError } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      success('Settings saved successfully!')
      onSave()
    } catch (err) {
      console.error('Error saving settings:', err)
      toastError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updatePointValue = (key: keyof typeof settings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateFeature = (key: keyof typeof settings.features, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value }
    }))
  }

  return (
    <div className="space-y-8">
      {/* Point Multipliers Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Point Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Check-in Points
            </label>
            <input
              type="number"
              min="0"
              value={settings.base_checkin_points}
              onChange={(e) => updatePointValue('base_checkin_points', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Points awarded for each successful check-in
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Bonus Points
            </label>
            <input
              type="number"
              min="0"
              value={settings.photo_bonus_points}
              onChange={(e) => updatePointValue('photo_bonus_points', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Additional points when participant uploads a photo
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Streak Bonus
            </label>
            <input
              type="number"
              min="0"
              value={settings.category_streak_bonus}
              onChange={(e) => updatePointValue('category_streak_bonus', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Bonus points for visiting 5 consecutive spots of the same category
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speed Demon Bonus
            </label>
            <input
              type="number"
              min="0"
              value={settings.speed_demon_bonus}
              onChange={(e) => updatePointValue('speed_demon_bonus', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Bonus points for visiting 10 spots within the first hour
            </p>
          </div>
        </div>
      </div>

      {/* Feature Toggles Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Toggles</h2>
        <div className="space-y-4">
          <FeatureToggle
            label="QR Check-in"
            description="Allow participants to check-in using QR codes"
            enabled={settings.features.qr_checkin}
            onChange={(value) => updateFeature('qr_checkin', value)}
          />

          <FeatureToggle
            label="GPS Check-in"
            description="Allow participants to check-in using GPS location"
            enabled={settings.features.gps_checkin}
            onChange={(value) => updateFeature('gps_checkin', value)}
          />

          <FeatureToggle
            label="Photo Check-in"
            description="Allow participants to upload photos during check-in for bonus points"
            enabled={settings.features.photo_checkin}
            onChange={(value) => updateFeature('photo_checkin', value)}
          />

          <FeatureToggle
            label="Badges"
            description="Enable streak-based badges and achievements"
            enabled={settings.features.badges}
            onChange={(value) => updateFeature('badges', value)}
          />

          <FeatureToggle
            label="Leaderboard"
            description="Show real-time leaderboard to participants"
            enabled={settings.features.leaderboard}
            onChange={(value) => updateFeature('leaderboard', value)}
          />

          <FeatureToggle
            label="Rewards Shop"
            description="Enable rewards shop and gacha mechanics"
            enabled={settings.features.rewards}
            onChange={(value) => updateFeature('rewards', value)}
          />

          <FeatureToggle
            label="Surveys"
            description="Enable surveys and questionnaires"
            enabled={settings.features.surveys}
            onChange={(value) => updateFeature('surveys', value)}
          />

          <FeatureToggle
            label="Category Filter"
            description="Allow participants to filter spots by category on the map"
            enabled={settings.features.category_filter}
            onChange={(value) => updateFeature('category_filter', value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface FeatureToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}

function FeatureToggle({ label, description, enabled, onChange }: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-orange-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
