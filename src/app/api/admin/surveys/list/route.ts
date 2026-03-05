import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ surveys })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
