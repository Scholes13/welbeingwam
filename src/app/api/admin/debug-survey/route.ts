import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const supabase = createSupabaseAdminClient()
    
    // Hardcoded survey ID from user request
    const surveyId = "ee9c8932-6817-431a-b207-a129c0435a98" 

    const report: any = {}

    // 1. Check Submissions directly
    const { data: submissions, error: subError } = await supabase
        .from('survey_submissions')
        .select('*')
        .eq('survey_id', surveyId)
    
    report.submissions = {
        count: submissions?.length,
        ids: submissions?.map(s => s.id),
        error: subError
    }
    
    // 2. Check ANY submissions that might be related to answers for this survey's questions
    const { data: questions } = await supabase
        .from('survey_questions')
        .select('id')
        .eq('survey_id', surveyId)
    
    const questionIds = questions?.map(q => q.id) || []
    report.questions = questionIds

    const { data: answers } = await supabase
        .from('survey_answers')
        .select('submission_id, submission:survey_submissions(id, survey_id)')
        .in('question_id', questionIds)

    report.answersCount = answers?.length
    
    // Get unique submission IDs linked to these answers
    const submissionIdsFromAnswers = Array.from(new Set(answers?.map((a: any) => a.submission_id)))
    report.submissionIdsFromAnswers = submissionIdsFromAnswers

    // Check details of these submissions
    const { data: relatedSubmissions } = await supabase
        .from('survey_submissions')
        .select('*')
        .in('id', submissionIdsFromAnswers)

    // ... (previous code)

    report.relatedSubmissions = relatedSubmissions?.map(s => ({
        id: s.id,
        survey_id: s.survey_id,
        isMatch: s.survey_id === surveyId
    }))

    // FIX DATA MANUALLY
    const idsToFix = relatedSubmissions?.map(s => s.id) || []
    if (idsToFix.length > 0) {
        const { error: updateError } = await supabase
            .from('survey_submissions')
            .update({ survey_id: surveyId })
            .in('id', idsToFix)
        
        report.fixResult = updateError ? updateError : "Fixed " + idsToFix.length + " rows"
    }

    return NextResponse.json(report)
}
