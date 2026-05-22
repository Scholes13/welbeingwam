import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getCanonicalAuthEmail, normalizeUsername } from '../../../../../lib/utils'
import { NextResponse } from 'next/server'

function generateProfileId() {
    return -(Date.now() + Math.floor(Math.random() * 1000))
}

async function findAuthUserByEmail(
    supabase: ReturnType<typeof createSupabaseAdminClient>,
    email: string,
) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) {
        console.error('Auth list users error:', error)
        return null
    }

    return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_users')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { username, password, fullName, gender } = await request.json()
    if (!username || !password) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }
    const normalizedUsername = normalizeUsername(username)

    const supabase = createSupabaseAdminClient()

    // Check if username exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', normalizedUsername)
        .maybeSingle()
    
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Create user in Supabase Auth first
    const email = getCanonicalAuthEmail(normalizedUsername)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: normalizedUsername, full_name: fullName || username }
    })

    let authUserId = authUser.user?.id ?? null

    if (authError || !authUserId) {
        const existingAuthUser = await findAuthUserByEmail(supabase, email)
        if (existingAuthUser) {
            authUserId = existingAuthUser.id
        }
    }

    if (!authUserId) {
        console.error('Auth create error:', authError)
        return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
    }

    // Avatar generation
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

    let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    if (gender === 'male') {
        const randomTop = maleTops[Math.floor(Math.random() * maleTops.length)]
        avatarUrl += `&top=${randomTop}&facialHairProbability=30`
    } else if (gender === 'female') {
        const randomTop = femaleTops[Math.floor(Math.random() * femaleTops.length)]
        avatarUrl += `&top=${randomTop}&facialHairProbability=0`
    }

    // Create profile linked to auth user
    // Use upsert because the `on_auth_user_created` trigger may have already
    // inserted a skeleton profile row when the auth user was created above.
    const profilePayload = {
        username: normalizedUsername,
        full_name: fullName || username,
        avatar_url: avatarUrl,
        gender: gender || null,
        is_manual: true,
        access_code: `CODE-${Math.floor(Math.random() * 9000) + 1000}`
    }

    const profileWrite = authUser.user
        ? supabase
            .from('profiles')
            .update(profilePayload)
            .eq('auth_user_id', authUserId)
        : supabase
            .from('profiles')
            .insert({
                id: generateProfileId(),
                auth_user_id: authUserId,
                ...profilePayload,
            })

    const { error } = await profileWrite

    if (error) {
        console.error('Create User Error:', error)
        // Cleanup: delete auth user if profile creation fails
        if (authUser.user) {
            await supabase.auth.admin.deleteUser(authUserId)
        }
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
