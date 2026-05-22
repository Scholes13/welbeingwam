import { createClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, isMissingSettingsTableError, parseSettingsRows } from '@/lib/settings'

export async function getMaintenanceSettings() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return DEFAULT_SETTINGS.maintenance
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance_enabled', 'maintenance_message'])

    if (error) {
      if (!isMissingSettingsTableError(error)) {
        console.error('Error fetching maintenance settings:', error)
      }
      return DEFAULT_SETTINGS.maintenance
    }

    return parseSettingsRows(data ?? []).maintenance
  } catch (error) {
    console.error('Unexpected maintenance settings error:', error)
    return DEFAULT_SETTINGS.maintenance
  }
}
