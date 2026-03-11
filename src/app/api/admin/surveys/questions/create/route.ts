import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { surveyId, questionText, orderIndex, options } = await request.json()
    if (!questionText || !surveyId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

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
