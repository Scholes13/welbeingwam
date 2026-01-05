import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
    const surveyId = "ee9c8932-6817-431a-b207-a129c0435a98" // The ID from user's URL

    console.log(`Checking data for survey: ${surveyId}`)

    // 1. Check Submissions directly
    const { data: submissions, error: subError } = await supabase
        .from('survey_submissions')
        .select('*')
        .eq('survey_id', surveyId)
    
    console.log(`Submissions found with explicit survey_id: ${submissions?.length}`)
    if (subError) console.error('Sub error:', subError)
    
    // 2. Check Answers for questions of this survey
    const { data: questions } = await supabase
        .from('survey_questions')
        .select('id')
        .eq('survey_id', surveyId)
    
    const questionIds = questions?.map(q => q.id) || []
    console.log(`Questions found: ${questionIds.length}`)

    const { data: answers } = await supabase
        .from('survey_answers')
        .select('submission_id, submission:survey_submissions(id, survey_id)')
        .in('question_id', questionIds)

    console.log(`Answers found for these questions: ${answers?.length}`)

    // 3. Analyze mismatch
    const submissionIdsFromAnswers = new Set(answers?.map((a: any) => a.submission_id))
    console.log(`Unique submission IDs from answers: ${submissionIdsFromAnswers.size}`)

    // Check properties of these submissions
    const { data: relatedSubmissions } = await supabase
        .from('survey_submissions')
        .select('*')
        .in('id', Array.from(submissionIdsFromAnswers))

    console.log(`Related submissions details:`)
    relatedSubmissions?.forEach(s => {
        console.log(`- ID: ${s.id}, SurveyID: ${s.survey_id}, Name: ${s.custom_name}, UserID: ${s.user_id}`)
        if (s.survey_id !== surveyId) {
            console.error(`  MISMATCH! submission.survey_id (${s.survey_id}) !== target (${surveyId})`)
        }
    })

}

checkData()
