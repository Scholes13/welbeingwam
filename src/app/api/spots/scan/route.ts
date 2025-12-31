import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('strava_athlete_id')?.value

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Find the spot by code
        const { data: spot, error: spotError } = await supabase
            .from('qr_spots')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single()

        if (spotError || !spot) {
            return NextResponse.json({ error: 'QR Code tidak valid atau sudah tidak aktif' }, { status: 404 })
        }

        // Check if expired
        if (spot.expires_at && new Date(spot.expires_at) < new Date()) {
            return NextResponse.json({ error: 'QR Code sudah kadaluarsa' }, { status: 400 })
        }

        // Check max claims if set
        if (spot.max_claims > 0) {
            const { count } = await supabase
                .from('user_spot_claims')
                .select('*', { count: 'exact', head: true })
                .eq('spot_id', spot.id)
            
            if (count && count >= spot.max_claims) {
                return NextResponse.json({ error: 'QR Code sudah mencapai batas claim maksimal' }, { status: 400 })
            }
        }

        // Check if user already claimed
        const { data: existing } = await supabase
            .from('user_spot_claims')
            .select('id')
            .eq('user_id', userId)
            .eq('spot_id', spot.id)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Kamu sudah pernah scan QR Code ini!' }, { status: 400 })
        }

        // Create claim record
        const { error: claimError } = await supabase
            .from('user_spot_claims')
            .insert({
                user_id: userId,
                spot_id: spot.id
            })

        if (claimError) throw claimError

        // Award points to user via point_adjustments (so it shows in leaderboard)
        await supabase
            .from('point_adjustments')
            .insert({
                user_id: userId,
                points: spot.points,
                reason: `Scanned QR Spot: ${spot.name}`
            })

        // Send notification
        await supabase.from('notifications').insert({
            user_id: userId,
            message: `🎯 Kamu mendapat +${spot.points} poin dari ${spot.name}!`,
            type: 'reward',
            title: 'Spot Claimed!'
        })

        return NextResponse.json({ 
            success: true, 
            points: spot.points,
            spotName: spot.name,
            message: `Berhasil! +${spot.points} poin dari ${spot.name} 🎉`
        })

    } catch (error) {
        console.error('Scan spot error:', error)
        return NextResponse.json({ error: 'Gagal memproses QR Code' }, { status: 500 })
    }
}
