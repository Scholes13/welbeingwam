import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create typed Supabase client with Realtime enabled
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper to create a typed client (for use in API routes with service role)
export function createTypedClient(url: string, key: string) {
  return createClient<Database>(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}
