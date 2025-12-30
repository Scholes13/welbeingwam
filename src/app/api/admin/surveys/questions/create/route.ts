import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { surveyId, questionText, orderIndex, options } = await request.json()
    // options: [{ label: '...', value: '...', tags: ['...'] }]

    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !questionText || !surveyId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify Admin
    const { data: adminUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single()

    if (adminUser?.username !== 'admin_wam') {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 1. Create Question
    const { data: questionData, error: qError } = await supabase
        .from('survey_questions')
        .insert({
            survey_id: surveyId,
            question_text: questionText,
            order_index: orderIndex || 0
        })
        .select()
        .single()

    if (qError) {
        console.error(qError);
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }

    // 2. Create Options (if any)
    if (options && options.length > 0) {
        const optionsToInsert = options.map((opt: any) => ({
            question_id: questionData.id,
            label: opt.label,
            value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
            recommended_tags: opt.tags || []
        }))

        const { error: oError } = await supabase
            .from('survey_options')
            .insert(optionsToInsert)
        
        if (oError) {
           console.error('Error creating options:', oError)
        }
    }

    return NextResponse.json({ success: true, id: questionData.id })

  } catch (error) {
    console.error('Create Question Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
