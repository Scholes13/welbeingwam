import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const questId = searchParams.get('questId')

        if (!questId) {
            return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        // Fetch quest completions with user profile
        const { data: claims, error } = await supabase
            .from('user_quests')
            .select(`
                id,
                completed_at,
                user:profiles (
                    id,
                    username,
                    full_name,
                    avatar_url,
                    instagram_username
                )
            `)
            .eq('quest_id', questId)
            .order('completed_at', { ascending: false })

        if (error) {
            console.error('Error fetching quest claims:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Format data
        const formattedClaims = claims.map((claim: any) => ({
            id: claim.id,
            completed_at: claim.completed_at,
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
