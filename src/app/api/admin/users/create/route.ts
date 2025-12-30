import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, password, fullName, gender } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !username || !password) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify Admin (Strict check)
    const { data: adminUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single()

    if (adminUser?.username !== 'admin_wam') {
         return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 })
    }

    // 2. Check if username exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
    
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // 3. Create User & Random Avatar Logic
    // Define Gender-Specific Tops (Verified Dicebear v7 Values)
    // Male: Short hair, hats, turbans, etc.
    const maleTops = [
        'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 
        'theCaesar', 'theCaesarAndSidePart', 'dreads', 'dreads01', 'dreads02', 
        'frizzle', 'shaggy', 'shaggyMullet', 'hat', 'winterHat1', 'winterHat02', 
        'winterHat03', 'winterHat04', 'turban'
    ]; 

    // Female: Long hair, hijab, buns, etc.
    const femaleTops = [
        'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight01', 
        'straight02', 'straightAndStrand', 'hijab', 'bigHair', 'bob', 
        'bun', 'curly', 'curvy', 'frida', 'fro', 'froBand'
    ];

    let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    // Append filters based on Gender
    if (gender === 'male') {
        const randomTop = maleTops[Math.floor(Math.random() * maleTops.length)];
        avatarUrl += `&top=${randomTop}&facialHairProbability=30`; // 30% chance of beard for men
    } else if (gender === 'female') {
        const randomTop = femaleTops[Math.floor(Math.random() * femaleTops.length)];
        avatarUrl += `&top=${randomTop}&facialHairProbability=0`; // 0% chance of beard for women
    }
    // If no gender selected, defaults to full random

    // Generate a pseudo-random ID (Negative to avoid Strava collisions)
    const newId = -Math.abs(Date.now() + Math.floor(Math.random() * 1000))

    const { error } = await supabase
        .from('profiles')
        .insert({
            id: newId,
            username: username,
            full_name: fullName || username,
            password: password, // Plain text as requested
            avatar_url: avatarUrl,
            gender: gender || null,
            is_manual: true,
            access_code: `CODE-${Math.floor(Math.random() * 9000) + 1000}` // Generate random access code
        })

    if (error) {
        console.error('Create User Error:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
