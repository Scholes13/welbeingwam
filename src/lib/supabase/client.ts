import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Legacy export for backward compatibility during migration
// Components that import { supabase } from '@/lib/supabase/client' still work
export const supabase = createSupabaseBrowserClient()
