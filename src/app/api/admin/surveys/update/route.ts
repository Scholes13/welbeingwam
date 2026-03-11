import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, title, description, is_active } = body

        if (!id) {
            return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        const { data, error } = await supabase
            .from('surveys')
            .update({ title, description, is_active })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating survey:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ survey: data })
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
