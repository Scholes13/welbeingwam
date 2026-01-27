import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')
    const doorprizeId = searchParams.get('doorprizeId')

    if (!activityId && !doorprizeId) {
        return NextResponse.json({ error: 'Activity ID or Doorprize ID is required' }, { status: 400 })
    }

    let query = supabase.from('doorprize_winners').select(`
            *,
            user:profiles (
                id,
                username,
                full_name,
                avatar_url,
                instagram_username
            )
        `)

    if (doorprizeId) {
        query = query.eq('doorprize_id', doorprizeId)
    } else {
        query = query.eq('activity_id', activityId)
    }

    const { data, error } = await query.order('won_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ winners: data })
}

export async function POST(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { activity_id, user_id, prize_name, doorprize_id } = await request.json()

    if (!user_id || !prize_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already won for this DOORPRIZE SESSION (if doorprize_id provided)
    // Or Activity (legacy)
    let duplicateCheck = supabase.from('doorprize_winners').select('id').eq('user_id', user_id)
    
    if (doorprize_id) {
        duplicateCheck = duplicateCheck.eq('doorprize_id', doorprize_id)
    } else {
        duplicateCheck = duplicateCheck.eq('activity_id', activity_id)
    }

    const { data: existing } = await duplicateCheck.single()

    if (existing) {
        return NextResponse.json({ error: 'User already won a prize in this session' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('doorprize_winners')
        .insert({
            activity_id, // Can be null if using doorprize_id only? But DB schema has it as FK? Let's assume we pass it or fetch it.
            // Ideally we only need doorprize_id and we can infer activity_id, but the table has both.
            // If the client doesn't pass activity_id, we might fail NOT NULL constraint.
            // We should ensure client passes it OR we relax the constraint (which I didn't do).
            // So client must pass both for now.
            user_id,
            prize_name,
            doorprize_id
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ winner: data })
}

export async function DELETE(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')
    const doorprizeId = searchParams.get('doorprizeId')
    const winnerId = searchParams.get('winnerId')

    if (!activityId && !doorprizeId) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    let query = supabase.from('doorprize_winners').delete()
    
    if (winnerId) {
        query = query.eq('id', winnerId)
    } else {
        // Reset all
        if (doorprizeId) query = query.eq('doorprize_id', doorprizeId)
        else query = query.eq('activity_id', activityId)
    }

    const { error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
