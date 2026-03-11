import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: surveyId } = await params

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

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
