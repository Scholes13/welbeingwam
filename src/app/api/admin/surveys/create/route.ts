import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { title, description } = await request.json()
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
        .from('surveys')
        .insert({ title, description })
        .select()
        .single()

    if (error) throw error

    return NextResponse.json({ success: true, survey: data })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
