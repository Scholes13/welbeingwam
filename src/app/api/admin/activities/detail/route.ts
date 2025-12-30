import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

        // Fetch activity details
        const { data: activity, error: actError } = await supabase
            .from('admin_activities')
            .select('*')
            .eq('id', id)
            .single()

        if (actError) throw actError

        // Fetch attendance with user profiles
        const { data: attendance, error: attError } = await supabase
            .from('attendance')
            .select(`
                scanned_at,
                user:profiles (
                    id,
                    full_name,
                    username,
                    avatar_url,
                    instagram_username
                )
            `)
            .eq('activity_id', id)
            .order('scanned_at', { ascending: false })

        if (attError) throw attError

        return NextResponse.json({
            activity,
            attendance: attendance.map((a: any) => ({
                scanned_at: a.scanned_at,
                ...a.user
            }))
        })

    } catch (error) {
        console.error('Error fetching activity details:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
