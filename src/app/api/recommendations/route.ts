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

    // 3. Score Products against User Profile (Vector Dot Product)
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
      
      // Add "Discovery Factor" (Random Jitter 0-5 points)
      // This prevents the exact same 3 classes from always winning if scores are close
      // and gives a chance for other relevant classes to appear.
      const discoveryFactor = Math.random() * 5
      
      return { ...product, score: totalScore + discoveryFactor, matchReasons: reasons }
    }) || []

    // 4. Sort & Pick Top 3
    const recommendations = scoredProducts
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3)

    return NextResponse.json({ recommendations, userProfile })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
