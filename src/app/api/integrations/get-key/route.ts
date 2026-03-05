import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const context = await getAuthProfileContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseAdminClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('sync_key')
        .eq('id', context.profileId)
        .single()

    return NextResponse.json({ sync_key: profile?.sync_key })

  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
