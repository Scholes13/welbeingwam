import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const surveyId = searchParams.get('surveyId')

        if (!surveyId) {
            return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Get Totals
        const { count: totalSubmissions, error: countError } = await supabase
            .from('survey_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', surveyId)

        if (countError) {
            return NextResponse.json({ error: countError.message }, { status: 500 })
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
            .limit(10) // Last 10

        return NextResponse.json({
            meta: {
                totalSubmissions
            },
            analytics: analytics,
            recent: recentSubmissions?.map((s: any) => ({
                id: s.id,
                date: s.created_at,
                name: s.custom_name || s.users?.raw_user_meta_data?.full_name || s.users?.email || 'Anonymous'
            }))
        })

    } catch (err: any) {
        console.error('Analytics Error:', err)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
