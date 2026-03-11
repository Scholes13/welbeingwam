import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const supabase = createSupabaseAdminClient()

    // Check if username exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
    
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Create user in Supabase Auth first
    const email = `${username}@werkudara.com`
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, full_name: fullName || username }
    })

    if (authError || !authUser.user) {
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

    const profileId = -Date.now()

    // Create profile linked to auth user
    const { error } = await supabase
        .from('profiles')
        .insert({
            id: profileId,
            auth_user_id: authUser.user.id,
            username: username,
            password: password,
            full_name: fullName || username,
            avatar_url: avatarUrl,
            gender: gender || null,
            is_manual: true,
            access_code: `CODE-${Math.floor(Math.random() * 9000) + 1000}`
        })

    if (error) {
        console.error('Create User Error:', error)
        // Cleanup: delete auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
