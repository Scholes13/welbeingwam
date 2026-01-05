import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const rewardId = searchParams.get('rewardId')

        if (!rewardId) {
            return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch claims with user profile
        const { data: claims, error } = await supabase
            .from('user_rewards')
            .select(`
                id,
                claimed_at,
                cost,
                user:profiles (
                    id,
                    username,
                    full_name,
                    avatar_url,
                    instagram_username
                )
            `)
            .eq('reward_id', rewardId)
            .order('claimed_at', { ascending: false })

        if (error) {
            console.error('Error fetching claims:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Format data
        const formattedClaims = claims.map((claim: any) => ({
            id: claim.id,
            claimed_at: claim.claimed_at,
            cost: claim.cost,
            user_id: claim.user?.id,
            username: claim.user?.username || 'unknown',
            full_name: claim.user?.full_name || 'Unknown User',
            avatar_url: claim.user?.avatar_url,
            instagram_username: claim.user?.instagram_username
        }))

        return NextResponse.json({ claims: formattedClaims })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
