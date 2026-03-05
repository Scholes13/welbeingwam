import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    const supabase = createSupabaseAdminClient()
    // 1. Check Admin Access (Support both Manual Code and Standard Login)
    const { authorized } = await verifyAdminPermission('admin')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete Options manually (safe bet if cascade not perfect)
    await supabase.from('survey_options').delete().eq('question_id', id)
    
    // Delete Question
    const { error } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
