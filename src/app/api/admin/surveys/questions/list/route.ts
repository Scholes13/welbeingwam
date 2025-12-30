import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { surveyId } = await request.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
