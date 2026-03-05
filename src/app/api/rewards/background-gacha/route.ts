import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { fetchUserEconomy } from '@/lib/rewards/service'
import { createRewardsRepository, rollBackgroundWorkflow, type BackgroundOption } from '@/lib/rewards/workflows'
import type { BackgroundGachaResponse } from '@/lib/rewards/dto'
import { NextResponse } from 'next/server'

const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'default',
    name: 'Sunset Orange',
    gradient: 'linear-gradient(180deg, #FC4C02 0%, #ff7043 100%)',
    image: null,
  },
  {
    id: 'olympus',
    name: 'Mount Olympus',
    gradient: 'linear-gradient(180deg, #ffd700 0%, #ffffff 100%)',
    image: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'christmas',
    name: 'Merry Christmas',
    gradient: 'linear-gradient(180deg, #c41e3a 0%, #165b33 100%)',
    image: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'newyear',
    name: 'New Year Fireworks',
    gradient: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'bali',
    name: 'Bali',
    gradient: 'linear-gradient(180deg, #ff6b35 0%, #f7931e 50%, #9b4dca 100%)',
    image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=400&fit=crop&q=80',
  },
  {
    id: 'street',
    name: 'Street',
    gradient: 'linear-gradient(180deg, #2b5876 0%, #4e4376 100%)',
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop&q=80',
  },
]

export async function GET() {
  const response = { backgrounds: BACKGROUNDS }
  return NextResponse.json(response)
}

export async function POST() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId
  const supabase = createSupabaseAdminClient()

  try {
    const economy = await fetchUserEconomy(supabase, userId)

    const workflowResult = await rollBackgroundWorkflow({
      repository: createRewardsRepository(supabase),
      userId,
      availableCoins: economy.availableCoins,
      backgrounds: BACKGROUNDS,
    })

    if (!workflowResult.ok) {
      const response: BackgroundGachaResponse = { error: workflowResult.error }
      return NextResponse.json(response, { status: workflowResult.status })
    }

    const response: BackgroundGachaResponse = {
      success: true,
      background: workflowResult.data.background,
      remainingCoins: economy.availableCoins - workflowResult.data.price,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Background Gacha Error:', error)
    const response: BackgroundGachaResponse = {
      error: error instanceof Error ? error.message : 'Failed to gacha',
    }
    return NextResponse.json(
      response,
      { status: 500 }
    )
  }
}
