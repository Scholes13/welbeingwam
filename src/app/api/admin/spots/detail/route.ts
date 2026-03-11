import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Spot ID is required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        // Fetch spot details
        const { data: spot, error: spotError } = await supabase
            .from('qr_spots')
            .select('*')
            .eq('id', id)
            .single()

        if (spotError) throw spotError

        // Fetch claims with user profiles
        const { data: claims, error: claimsError } = await supabase
            .from('user_spot_claims')
            .select(`
                claimed_at,
                user:profiles (
                    id,
                    full_name,
                    username,
                    avatar_url,
                    instagram_username
                )
            `)
            .eq('spot_id', id)
            .order('claimed_at', { ascending: false })

        if (claimsError) throw claimsError

        return NextResponse.json({
            spot,
            claims: claims.map((c: any) => ({
                claimed_at: c.claimed_at,
                ...c.user
            }))
        })

    } catch (error) {
        console.error('Error fetching spot details:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
