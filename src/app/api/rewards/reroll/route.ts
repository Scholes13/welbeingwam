import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('strava_athlete_id')?.value

  if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Fetch User Stats (Coins) & Gender
    const { data: profiles } = await supabase.from('profiles').select('gender').eq('id', userId).limit(1)
    const profile = profiles?.[0]
    const gender = profile?.gender || 'male' // Default to male if unspecified

    // Calculate Coins
    const { data: stepData } = await supabase.from('activities').select('steps').eq('user_id', userId)
    const totalSteps = stepData?.reduce((sum, act) => sum + (act.steps || 0), 0) || 0

    const { data: userQuests } = await supabase
        .from('user_quests')
        .select(`quests ( points )`)
        .eq('user_id', userId)
        .eq('status', 'approved')
    const questPoints = userQuests?.reduce((sum, uq: any) => sum + (uq.quests?.points || 0), 0) || 0

    const { data: adjustments } = await supabase.from('point_adjustments').select('points').eq('user_id', userId)
    const adjustmentPoints = adjustments?.reduce((sum, adj) => sum + (adj.points || 0), 0) || 0

    const totalEarned = totalSteps + questPoints + adjustmentPoints

    const { data: spentRewards } = await supabase.from('user_rewards').select('cost').eq('user_id', userId)
    const totalSpent = spentRewards?.reduce((sum, ur) => sum + (ur.cost || 0), 0) || 0

    const availableCoins = totalEarned - totalSpent

    // 2. Fetch Reroll Reward Price
    const { data: rewards } = await supabase.from('rewards').select('*').eq('title', 'Avatar Reroll').limit(1)
    const rerollReward = rewards?.[0]
    
    if (!rerollReward) return NextResponse.json({ error: 'Reroll reward not found in DB' }, { status: 500 })

    const price = rerollReward.required_points

    if (availableCoins < price) {
        return NextResponse.json({ error: `Not enough coins. Need ${price}, have ${availableCoins}` }, { status: 403 })
    }

    // 3. Generate New Avatar URL
    // Logic matched from src/app/api/admin/users/create/route.ts
    // Define Gender-Specific Tops (Verified Dicebear v7 Values)
    
    const maleTops = [
        'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 
        'theCaesar', 'theCaesarAndSidePart', 'dreads', 'dreads01', 'dreads02', 
        'frizzle', 'shaggy', 'shaggyMullet', 'hat', 'winterHat1', 'winterHat02', 
        'winterHat03', 'winterHat04', 'turban'
    ]; 

    const femaleTops = [
        'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight01', 
        'straight02', 'straightAndStrand', 'hijab', 'bigHair', 'bob', 
        'bun', 'curly', 'curvy', 'frida', 'fro', 'froBand'
    ];

    const randomSeed = Math.random().toString(36).substring(7)
    let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`
    
    // Append filters based on Gender
    if (gender === 'male') {
        const randomTop = maleTops[Math.floor(Math.random() * maleTops.length)];
        avatarUrl += `&top=${randomTop}&facialHairProbability=30`; // 30% chance of beard for men
    } else if (gender === 'female') {
        const randomTop = femaleTops[Math.floor(Math.random() * femaleTops.length)];
        avatarUrl += `&top=${randomTop}&facialHairProbability=0`; // 0% chance of beard for women
    }
    // If no gender, use random seed defaults

    // 4. Perform Transaction
    // Insert Claim
    const { error: claimError } = await supabase
        .from('user_rewards')
        .insert([{ 
            user_id: userId, 
            reward_id: rerollReward.id,
            cost: price
        }])
    
    if (claimError) throw claimError

    // 5. Update Profile Avatar (DISABLED: Frontend will handle "Equip" after preview)
    /*
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)

    if (updateError) throw updateError
    */

    return NextResponse.json({ success: true, newAvatarUrl: avatarUrl, remainingCoins: availableCoins - price })

  } catch (error) {
    console.error('Reroll Error Breakdown:', error)
    if (error instanceof Error) {
        console.error('Message:', error.message)
        console.error('Stack:', error.stack)
    }
    return NextResponse.json({ 
        error: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error)) 
    }, { status: 500 })
  }
}
