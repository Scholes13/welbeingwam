import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SurveyAnswerInput = {
    questionId: string
    selectedOptionIndex?: number | null
    responseText?: string | null
}

export async function POST(request: Request) {
    try {
        const supabase = createSupabaseAdminClient()

        // Get authenticated user (optional — surveys can be anonymous)
        const context = await getAuthProfileContext()
        let userId: string | null = null
        let customName: string | null = null

        if (context) {
            userId = context.authUser.id

            // Fetch User Details from profiles
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name')
                    .eq('id', context.profileId)
                    .single()
                
                if (profile) {
                    customName = profile.full_name || profile.username
                }
            } catch {
                console.log('Failed to fetch profile details, proceeding with just ID')
            }
        }

        const { surveyId, answers } = await request.json()

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID required' }, { status: 400 })
        }

        if (!answers || !Array.isArray(answers)) {
            return NextResponse.json({ error: 'Answers required' }, { status: 400 })
        }

        // Create submission record
        const { data: submission, error: subError } = await supabase
            .from('survey_submissions')
            .insert({
                survey_id: surveyId,
                user_id: userId,
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
            const answerRows = (answers as SurveyAnswerInput[]).map((ans) => ({
                submission_id: submission.id,
                question_id: ans.questionId,
                selected_option_index: ans.selectedOptionIndex ?? null,
                response_text: ans.responseText || null
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
