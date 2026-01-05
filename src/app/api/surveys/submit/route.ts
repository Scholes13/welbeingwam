import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('strava_athlete_id')?.value

        const { surveyId, answers } = await request.json()

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID required' }, { status: 400 })
        }

        if (!answers || !Array.isArray(answers)) {
            return NextResponse.json({ error: 'Answers required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let customName = null
        if (userId) {
            // Try to get user details to populate custom_name
            // 1. Try fetching from auth.users via admin
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
            
            if (user) {
                customName = user.user_metadata?.full_name || user.user_metadata?.name || user.email
            }
        }

        // Create submission record
        const { data: submission, error: subError } = await supabase
            .from('survey_submissions')
            .insert({
                survey_id: surveyId,
                user_id: userId || null,
                custom_name: customName,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (subError) {
            console.error('Submission error:', subError)
            return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
        }

        // Save individual answers
        if (submission && answers.length > 0) {
            const answerRows = answers.map((ans: any) => ({
                submission_id: submission.id,
                question_id: ans.questionId,
                selected_option_index: ans.selectedOptionIndex
            }))

            const { error: ansError } = await supabase
                .from('survey_answers')
                .insert(answerRows)

            if (ansError) {
                console.error('Answers error:', ansError)
            }
        }

        return NextResponse.json({ 
            success: true, 
            submissionId: submission.id 
        })

    } catch (error) {
        console.error('Save responses error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
