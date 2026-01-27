import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        
        // Setup Supabase Client with Cookies for Auth
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false
            }
        })

        // Try to get authenticated user from session cookies
        // APPS USE CUSTOM AUTH: Cookie 'strava_athlete_id' holds the profiles.id (UUID or BigInt)
        
        let userId: string | null = null
        let customName: string | null = null

        const authCookie = cookieStore.get('strava_athlete_id')?.value
        
        if (authCookie) {
            userId = authCookie
            
            // Fetch User Details from PROFILES table (not auth.users)
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name, firstname, lastname')
                    .eq('id', userId)
                    .single()
                
                if (profile) {
                    customName = profile.full_name || 
                                 (profile.firstname ? `${profile.firstname} ${profile.lastname || ''}`.trim() : profile.username)
                }
            } catch (ignore) {
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
                user_id: userId, // Now refers to profiles.id (or null) - Constraint dropped
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
                selected_option_index: ans.selectedOptionIndex ?? null, // Allow null
                response_text: ans.responseText || null // Map text/url
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
