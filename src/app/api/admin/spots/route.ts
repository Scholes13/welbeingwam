import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

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

    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, points, maxClaims, expiresAt, clue } = await request.json()

    if (!name || points === undefined) {
        return NextResponse.json({ error: 'Name and points are required' }, { status: 400 })
    }

    try {
        // Generate unique code for QR
        const code = `SPOT-${nanoid(8).toUpperCase()}`

        const { data, error } = await supabase
            .from('qr_spots')
            .insert({
                name,
                description: description || null,
                code,
                points: parseInt(points) || 0,
                max_claims: parseInt(maxClaims) || 0,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
                created_by: userId,
                clue: clue || null
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, spot: data })
    } catch (error) {
        console.error('Create spot error:', error)
        return NextResponse.json({ error: 'Failed to create spot' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('strava_athlete_id')?.value

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { data: spots, error } = await supabase
            .from('qr_spots')
            .select(`
                *,
                claims:user_spot_claims(count)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transform data to include claim count
        const spotsWithCounts = spots?.map(spot => ({
            ...spot,
            claim_count: spot.claims?.[0]?.count || 0
        }))

        return NextResponse.json({ spots: spotsWithCounts })
    } catch (error) {
        console.error('List spots error:', error)
        return NextResponse.json({ error: 'Failed to list spots' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('strava_athlete_id')?.value

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const spotId = searchParams.get('id')

    if (!spotId) {
        return NextResponse.json({ error: 'Spot ID required' }, { status: 400 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { error } = await supabase
            .from('qr_spots')
            .delete()
            .eq('id', spotId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete spot error:', error)
        return NextResponse.json({ error: 'Failed to delete spot' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('strava_athlete_id')?.value

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, is_active } = await request.json()

    if (!id || is_active === undefined) {
        return NextResponse.json({ error: 'ID and is_active are required' }, { status: 400 })
    }

    try {
        const { error } = await supabase
            .from('qr_spots')
            .update({ is_active })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Toggle spot error:', error)
        return NextResponse.json({ error: 'Failed to toggle spot' }, { status: 500 })
    }
}
