import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient()

  try {
    // 1. Check Admin Access (Support both Manual Code and Standard Login)
    const { authorized } = await verifyAdminPermission('admin')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Manual Cascade Delete
    // 1. Get all questions for this survey
    const { data: questions } = await supabase.from('survey_questions').select('id').eq('survey_id', id)
    
    if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id)
        
        // 2. Delete all options for these questions
        await supabase.from('survey_options').delete().in('question_id', questionIds)
        
        // 3. Delete the questions
        await supabase.from('survey_questions').delete().eq('survey_id', id)
    }

    // 4. Delete the survey itself
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
