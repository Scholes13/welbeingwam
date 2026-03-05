import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { surveyId } = await request.json()
    
    const supabase = createSupabaseAdminClient()

    if (!surveyId) {
         return NextResponse.json({ questions: [] })
    }

    // Fetch Questions
    const { data: questions, error } = await supabase
        .from('survey_questions')
        .select('*, survey_options(*)')
        .eq('survey_id', surveyId)
        .order('order_index', { ascending: true })

    if (error) throw error

    return NextResponse.json({ questions })

  } catch (error) {
    console.error('List Questions Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
