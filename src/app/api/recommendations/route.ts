import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SurveyAnswer {
  questionId: string
  selectedOptionIndex: number
}

interface Product {
  id: string
  name: string
  description: string
  time: string
  instructor: string
  // Updated to use the new JSONB column for scoring
  weighted_tags: Record<string, number> 
  score?: number
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { answers } = await request.json()

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 })
    }

    // 1. Fetch Questions & Products
    // Using order_index for safe sorting
    const { data: questions, error: qError } = await supabase
      .from('survey_questions')
      .select('*')
      .order('order_index', { ascending: true })
    
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('*')

    if (qError || pError) {
      console.error('Error fetching data:', qError || pError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 2. Calculate User Needs Profile (Bucket Scores)
    // e.g., userProfile = { peace: 15, power: 5, joy: 0 }
    const userProfile: Record<string, number> = {}
    
    answers.forEach((ans: SurveyAnswer) => {
      const q = questions.find((q: any) => q.id === ans.questionId)
      // Check for options existence
      if (q && q.options && q.options[ans.selectedOptionIndex]) {
        const impact = q.options[ans.selectedOptionIndex].impact || {}
        Object.entries(impact).forEach(([tag, score]) => {
          userProfile[tag] = (userProfile[tag] || 0) + (score as number)
        })
      }
    })

    // 3. User Level Check (Q6: Experience)
    // Order Index 6: 0=Pemula, 1=Casual, 2=Berpengalaman
    const q6 = questions.find((q: any) => q.order_index === 6)
    const xpAnswer = q6 ? answers.find((a: SurveyAnswer) => a.questionId === q6.id) : null
    const isBeginnerOrCasual = xpAnswer && (xpAnswer.selectedOptionIndex === 0 || xpAnswer.selectedOptionIndex === 1)

    // --- NEW: SAVE SUBMISSION TO DB ---
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const surveyId = answers[0]?.surveyId || request.headers.get('x-survey-id') // Fallback or passed in body

    if (answers.length > 0) {
        // We need survey_id. If it wasn't passed, we might need to find it from the question.
        // For now, let's assume the body passed 'surveyId' alongside 'answers', 
        // OR we look it up from the first question.
        
        let targetSurveyId = null
        // Try getting from body if available (need to update request parsing above)
        // OR get from the question's survey_id relation if we fetched it.
        if (questions.length > 0) {
            targetSurveyId = questions[0].survey_id
        }

        if (targetSurveyId) {
            const { data: submission, error: subError } = await supabase
                .from('survey_submissions')
                .insert({
                    survey_id: targetSurveyId,
                    user_id: userId, // Link to user if logged in
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (!subError && submission) {
                const answerRows = answers.map((ans: any) => ({
                    submission_id: submission.id,
                    question_id: ans.questionId,
                    selected_option_index: ans.selectedOptionIndex
                }))

                await supabase.from('survey_answers').insert(answerRows)
            } else {
                console.error('Failed to save submission:', subError)
            }
        }
    }
    // ----------------------------------

    // 4. Score Products against User Profile (Vector Dot Product)
    const scoredProducts = products?.map((product: any) => {
      let totalScore = 0
      const reasons: string[] = []
      
      // Use the new weighted_tags column (fallback to empty obj)
      const tags = product.weighted_tags || {}

      // Calculate compatibility
      Object.entries(tags).forEach(([tag, weight]) => {
        const w = weight as number
        if (userProfile[tag]) {
          // Score = Tag Weight * User Need
          const matchPoints = w * userProfile[tag]
          totalScore += matchPoints
          
          // Track primary reasons for high matches
          if (matchPoints > 15) {
            reasons.push(tag)
          }
        }
      })
      
      // LOGIC: Penalize "Flow" classes for Beginners/Casuals
      // User Rule: "Yang ada kata 'Flow' itu untuk expert"
      if (isBeginnerOrCasual && product.name.toLowerCase().includes('flow')) {
        totalScore -= 50 // HARD BLOCK: -50 ensures it never wins
      }
      
      // Add "Discovery Factor" (Random Jitter 0-5 points)
      // This prevents the exact same 3 classes from always winning if scores are close
      // and gives a chance for other relevant classes to appear.
      const discoveryFactor = Math.random() * 5
      
      return { ...product, score: totalScore + discoveryFactor, matchReasons: reasons }
    }) || []

    // 5. Sort & Pick Top 3
    const recommendations = scoredProducts
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3)

    return NextResponse.json({ recommendations, userProfile })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
