import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { fetchUserEconomy } from '@/lib/rewards/service'
import { createRewardsRepository, revealCluesWorkflow } from '@/lib/rewards/workflows'
import type { RevealCluesResponse } from '@/lib/rewards/dto'
import { NextResponse } from 'next/server'

const CLUE_REVEAL_PRICE = 200

export async function POST() {
  try {
    const context = await getAuthProfileContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = context.profileId
    const supabase = createSupabaseAdminClient()
    const economy = await fetchUserEconomy(supabase, userId)

    const workflowResult = await revealCluesWorkflow({
      repository: createRewardsRepository(supabase),
      userId,
      availableCoins: economy.availableCoins,
      price: CLUE_REVEAL_PRICE,
    })

    if (!workflowResult.ok) {
      const response: RevealCluesResponse = { error: workflowResult.error }
      return NextResponse.json(response, { status: workflowResult.status })
    }

    const response: RevealCluesResponse = {
      success: true,
      newBalance: workflowResult.data.remainingCoins,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Reveal clues error:', error)
    const response: RevealCluesResponse = { error: 'Something went wrong' }
    return NextResponse.json(response, { status: 500 })
  }
}
