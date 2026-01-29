import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// Gender-specific avatar tops (Dicebear v7)
const maleTops = [
  'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides',
  'theCaesar', 'theCaesarAndSidePart', 'dreads', 'dreads01', 'dreads02',
  'frizzle', 'shaggy', 'shaggyMullet', 'hat', 'winterHat1', 'winterHat02',
  'winterHat03', 'winterHat04', 'turban'
]

const femaleTops = [
  'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight01',
  'straight02', 'straightAndStrand', 'hijab', 'bigHair', 'bob',
  'bun', 'curly', 'curvy', 'frida', 'fro', 'froBand'
]

function generateAvatarUrl(name: string, gender?: string): string {
  const seed = `${name}-${Date.now()}`
  let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`

  if (gender === 'male') {
    const randomTop = maleTops[Math.floor(Math.random() * maleTops.length)]
    avatarUrl += `&top=${randomTop}&facialHairProbability=30`
  } else if (gender === 'female') {
    const randomTop = femaleTops[Math.floor(Math.random() * femaleTops.length)]
    avatarUrl += `&top=${randomTop}&facialHairProbability=0`
  }

  return avatarUrl
}

function generateParticipantCode(): string {
  // Generate 8-character alphanumeric code
  return nanoid(8).toUpperCase()
}

export async function POST(request: Request) {
  try {
    const { name, gender, photo_url } = await request.json()

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: { code: 'INVALID_NAME', message: 'Name must be at least 2 characters' } },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate unique participant code
    let code = generateParticipantCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break

      code = generateParticipantCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: { code: 'CODE_GENERATION_FAILED', message: 'Failed to generate unique code' } },
        { status: 500 }
      )
    }

    // Generate avatar URL (use provided photo or generate random avatar)
    const avatarUrl = photo_url || generateAvatarUrl(name.trim(), gender)

    // Create participant
    const { data: participant, error } = await supabase
      .from('participants')
      .insert({
        code,
        name: name.trim(),
        profile_photo_url: avatarUrl,
        total_points: 0,
        is_admin: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating participant:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create participant' } },
        { status: 500 }
      )
    }

    // Set session cookie (valid for 7 days)
    const cookieStore = await cookies()
    const sevenDays = 60 * 60 * 24 * 7
    cookieStore.set('participant_id', participant.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sevenDays
    })

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        code: participant.code,
        name: participant.name,
        profile_photo_url: participant.profile_photo_url
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
