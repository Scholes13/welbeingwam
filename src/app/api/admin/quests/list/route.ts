import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const { data: quests, error } = await supabase
        .from('quests')
        .select('*, dimension:dimensions(id, name, display_name, icon)')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 })
    }

    return NextResponse.json({ quests })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
