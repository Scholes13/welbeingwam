import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const surveyId = searchParams.get('surveyId')

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        // 1. Get Totals from submissions
        const { count: submissionCount, error: countError } = await supabase
            .from('survey_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', surveyId)

        // Also count unique submission_ids from survey_answers as fallback
        // (for older data that may not have proper submissions)
        const { data: answerSubmissions } = await supabase
            .from('survey_answers')
            .select('submission_id')
            .not('submission_id', 'is', null)

        // Get question IDs for this survey to filter answers
        const { data: surveyQuestions } = await supabase
            .from('survey_questions')
            .select('id')
            .eq('survey_id', surveyId)

        const questionIds = surveyQuestions?.map(q => q.id) || []

        // Count unique submissions from answers for this survey's questions
        const { data: answersForSurvey } = await supabase
            .from('survey_answers')
            .select('submission_id')
            .in('question_id', questionIds)

        const uniqueSubmissionIds = new Set(answersForSurvey?.map(a => a.submission_id).filter(Boolean) || [])
        const totalSubmissions = (submissionCount || 0) > 0 ? submissionCount : uniqueSubmissionIds.size

        if (countError) {
            console.error('Count error:', countError)
        }

        // 2. Get Questions for this survey
        const { data: questions, error: qError } = await supabase
            .from('survey_questions')
            .select('id, question_text, options, order_index')
            .eq('survey_id', surveyId)
            .order('order_index', { ascending: true })

        if (qError) {
            return NextResponse.json({ error: qError.message }, { status: 500 })
        }

        // 3. Aggregate Data
        const analytics = await Promise.all(questions.map(async (q) => {
            // Get answer distribution for this question
            const { data: answers, error: aError } = await supabase
                .from('survey_answers')
                .select('selected_option_index')
                .eq('question_id', q.id)

            // Calculate Counts
            const optionCounts = new Array(q.options.length).fill(0)
            answers?.forEach((a: any) => {
                if (a.selected_option_index >= 0 && a.selected_option_index < optionCounts.length) {
                    optionCounts[a.selected_option_index]++
                }
            })

            // Determine dominant answer
            const maxVal = Math.max(...optionCounts)
            const maxIndex = optionCounts.indexOf(maxVal)
            const dominantLabel = maxVal > 0 ? q.options[maxIndex].label : "No data"

            return {
                questionId: q.id,
                questionText: q.question_text,
                totalAnswers: answers?.length || 0,
                distribution: q.options.map((opt: any, idx: number) => ({
                    label: opt.label,
                    count: optionCounts[idx],
                    percentage: answers?.length ? Math.round((optionCounts[idx] / answers.length) * 100) : 0
                })),
                dominantAnswer: dominantLabel
            }
        }))

        // 4. Get recent participants (with user details)
        const { data: recentSubmissions } = await supabase
            .from('survey_submissions')
            .select(`
                id,
                created_at,
                user_id,
                custom_name,
                users:user_id (
                    email,
                    raw_user_meta_data
                )
            `)
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: false })
            .limit(20) // Increased limit

        // 5. Get Answers for these submissions
        const submissionIds = recentSubmissions?.map(s => s.id) || []
        const { data: submissionAnswers } = await supabase
            .from('survey_answers')
            .select('submission_id, question_id, selected_option_index')
            .in('submission_id', submissionIds)

        // Helper to get Answer Details
        const getAnswerDetails = (subId: string) => {
            const answers = submissionAnswers?.filter(a => a.submission_id === subId) || []
            return answers.map(a => {
                const question = questions.find(q => q.id === a.question_id)
                if (!question) return null
                const option = question.options[a.selected_option_index]
                return {
                    questionId: question.id,
                    questionText: question.question_text,
                    answer: option?.label || option?.text || 'Unknown'
                }
            }).filter(Boolean)
        }

        return NextResponse.json({
            meta: {
                totalSubmissions
            },
            analytics: analytics,
            recent: recentSubmissions?.map((s: any) => ({
                id: s.id,
                date: s.created_at,
                name: s.custom_name || s.users?.raw_user_meta_data?.full_name || s.users?.email || 'Anonymous',
                answers: getAnswerDetails(s.id)
            }))
        })

    } catch (err: any) {
        console.error('Analytics Error:', err)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
