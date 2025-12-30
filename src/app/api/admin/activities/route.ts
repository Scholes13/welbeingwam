
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// 1. GET: Fetch all activities + attendance count
export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch activities ordered by newest first
        const { data: activities, error } = await supabase
            .from('admin_activities')
            .select(`
                *,
                attendance_count:attendance(count)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transform data to get clean count
        const formatted = activities.map(a => ({
            ...a,
            attendance_count: a.attendance_count ? a.attendance_count[0]?.count : 0
        }))

        return NextResponse.json(formatted)

    } catch (error) {
        console.error('Fetch Activities Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

// 2. POST: Create new activity
export async function POST(request: Request) {
    try {
        const { title, date, points } = await request.json()

        if (!title || !date) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabase
            .from('admin_activities')
            .insert({ title, activity_date: date, points: points || 0 })

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Create Activity Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

// 3. DELETE: Delete activity
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Delete activity (Cascade should handle attendance if configured, otherwise we might need to delete attendance first)
        // Assuming CASCADE is set up or we want to hard delete. 
        // If no cascade, we delete attendance first manually to be safe.
        await supabase.from('attendance').delete().eq('activity_id', id)
        await supabase.from('point_adjustments').delete().ilike('reason', `%${id}%`) // Optional cleanup if we stored ID, but reason implies loose coupling
        
        const { error } = await supabase
            .from('admin_activities')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Delete Activity Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
