import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Background themes with high-quality Unsplash images  
const BACKGROUNDS = [
    { 
        id: 'default', 
        name: 'Sunset Orange',
        gradient: 'linear-gradient(180deg, #FC4C02 0%, #ff7043 100%)',
        image: null
    },
    { 
        id: 'olympus', 
        name: 'Mount Olympus',
        gradient: 'linear-gradient(180deg, #ffd700 0%, #ffffff 100%)',
        image: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=800&h=400&fit=crop&q=80' // Greek columns
    },
    { 
        id: 'christmas', 
        name: 'Merry Christmas',
        gradient: 'linear-gradient(180deg, #c41e3a 0%, #165b33 100%)',
        image: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&h=400&fit=crop&q=80' // Christmas tree lights
    },
    { 
        id: 'newyear', 
        name: 'New Year Fireworks',
        gradient: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&h=400&fit=crop&q=80' // Fireworks
    },
    { 
        id: 'bali', 
        name: 'Bali',
        gradient: 'linear-gradient(180deg, #ff6b35 0%, #f7931e 50%, #9b4dca 100%)',
        image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=400&fit=crop&q=80' // Bali gate sunset
    },
    { 
        id: 'street', 
        name: 'Street',
        gradient: 'linear-gradient(180deg, #2b5876 0%, #4e4376 100%)',
        image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop&q=80' // Osaka street
    }
]

export async function GET() {
    return NextResponse.json({ backgrounds: BACKGROUNDS })
}

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
        // 1. Calculate available coins (same logic as avatar reroll)
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

        // 2. Find Background Reroll reward price
        const { data: rewards } = await supabase.from('rewards').select('*').eq('title', 'Background Reroll').limit(1)
        const gachaReward = rewards?.[0]

        if (!gachaReward) {
            return NextResponse.json({ error: 'Background Reroll reward not found. Please create it in Admin Panel.' }, { status: 500 })
        }

        const price = gachaReward.required_points

        if (availableCoins < price) {
            return NextResponse.json({ error: `Not enough coins. Need ${price}, have ${availableCoins}` }, { status: 403 })
        }

        // 3. Random select background (excluding default for gacha)
        const gachaBackgrounds = BACKGROUNDS.filter(bg => bg.id !== 'default')
        const randomIndex = Math.floor(Math.random() * gachaBackgrounds.length)
        const selectedBackground = gachaBackgrounds[randomIndex]

        // 4. Record the spend
        const { error: claimError } = await supabase
            .from('user_rewards')
            .insert([{
                user_id: userId,
                reward_id: gachaReward.id,
                cost: price
            }])

        if (claimError) throw claimError

        return NextResponse.json({
            success: true,
            background: selectedBackground,
            remainingCoins: availableCoins - price
        })

    } catch (error) {
        console.error('Background Gacha Error:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to gacha'
        }, { status: 500 })
    }
}
