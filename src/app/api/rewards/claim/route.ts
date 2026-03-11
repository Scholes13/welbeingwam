import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { fetchUserEconomy } from '@/lib/rewards/service'
import { claimRewardWorkflow, createRewardsRepository } from '@/lib/rewards/workflows'
import { parseClaimRewardInput } from '@/lib/rewards/schemas'
import type { ClaimRewardResponse } from '@/lib/rewards/dto'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId
  const supabase = createSupabaseAdminClient()

  try {
    const body = await request.json()
    const parsedBody = parseClaimRewardInput(body)
    if (!parsedBody.success) {
      const response: ClaimRewardResponse = { error: 'Missing Reward ID' }
      return NextResponse.json(response, { status: 400 })
    }

    const rewardId = parsedBody.data.rewardId

    const economy = await fetchUserEconomy(supabase, userId)

    const workflowResult = await claimRewardWorkflow({
      repository: createRewardsRepository(supabase),
      userId,
      rewardId,
      availableCoins: economy.availableCoins,
    })

    if (!workflowResult.ok) {
      const response: ClaimRewardResponse = { error: workflowResult.error }
      return NextResponse.json(response, { status: workflowResult.status })
    }

    const response: ClaimRewardResponse = { success: true }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Claim Reward Error:', error)
    const response: ClaimRewardResponse = { error: 'Failed' }
    return NextResponse.json(response, { status: 500 })
  }
}
