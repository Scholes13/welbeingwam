import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { fetchUserEconomy } from '@/lib/rewards/service'
import { createRewardsRepository, rerollAvatarWorkflow } from '@/lib/rewards/workflows'
import type { AvatarRerollResponse } from '@/lib/rewards/dto'
import { NextResponse } from 'next/server'

type ProfileGenderRow = {
  gender: string | null
}

const MALE_TOPS = [
  'shortCurly',
  'shortFlat',
  'shortRound',
  'shortWaved',
  'sides',
  'theCaesar',
  'theCaesarAndSidePart',
  'dreads',
  'dreads01',
  'dreads02',
  'frizzle',
  'shaggy',
  'shaggyMullet',
  'hat',
  'winterHat1',
  'winterHat02',
  'winterHat03',
  'winterHat04',
  'turban',
]

const FEMALE_TOPS = [
  'longButNotTooLong',
  'miaWallace',
  'shavedSides',
  'straight01',
  'straight02',
  'straightAndStrand',
  'hijab',
  'bigHair',
  'bob',
  'bun',
  'curly',
  'curvy',
  'frida',
  'fro',
  'froBand',
]

function buildAvatarUrl(gender: string | null): string {
  const randomSeed = Math.random().toString(36).slice(2)
  let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`

  if (gender === 'male') {
    const randomTop = MALE_TOPS[Math.floor(Math.random() * MALE_TOPS.length)]
    avatarUrl += `&top=${randomTop}&facialHairProbability=30`
  } else if (gender === 'female') {
    const randomTop = FEMALE_TOPS[Math.floor(Math.random() * FEMALE_TOPS.length)]
    avatarUrl += `&top=${randomTop}&facialHairProbability=0`
  }

  return avatarUrl
}

export async function POST() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId
  const supabase = createSupabaseAdminClient()

  try {
    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', userId)
      .limit(1)

    if (profileError) throw profileError

    const profile = (profilesData?.[0] ?? null) as ProfileGenderRow | null
    const economy = await fetchUserEconomy(supabase, userId)

    const workflowResult = await rerollAvatarWorkflow({
      repository: createRewardsRepository(supabase),
      userId,
      availableCoins: economy.availableCoins,
    })

    if (!workflowResult.ok) {
      const response: AvatarRerollResponse = { error: workflowResult.error }
      return NextResponse.json(response, { status: workflowResult.status })
    }

    const avatarUrl = buildAvatarUrl(profile?.gender ?? null)

    const response: AvatarRerollResponse = {
      success: true,
      newAvatarUrl: avatarUrl,
      remainingCoins: economy.availableCoins - workflowResult.data.price,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Reroll Error:', error)
    const response: AvatarRerollResponse = {
      error: error instanceof Error ? error.message : 'Failed to reroll avatar',
    }
    return NextResponse.json(
      response,
      { status: 500 }
    )
  }
}
