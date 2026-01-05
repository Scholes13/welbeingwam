import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const surveyId = params.id

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: survey, error } = await supabase
            .from('surveys')
            .select('id, title, description, is_active')
            .eq('id', surveyId)
            .single()

        if (error || !survey) {
            return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
        }

        return NextResponse.json({ survey })

    } catch (error) {
        console.error('Get survey error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
