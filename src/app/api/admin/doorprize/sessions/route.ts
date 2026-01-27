import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        console.log('GET doorprizes - ID:', id)

        let query = supabase
            .from('doorprizes')
            .select('*')
        
        if (id) {
            // @ts-ignore - Supabase type quirk with conditional chaining
            query = query.eq('id', id).single()
        } else {
            // @ts-ignore
            query = query.order('created_at', { ascending: false })
        }

        const { data, error } = await query

        if (error) {
            console.error('GET Supabase error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('GET doorprizes - Success, count:', Array.isArray(data) ? data.length : 1)
        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('GET Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch doorprizes' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, activity_id, prize_name, quantity, background_url } = body

        console.log('Creating doorprize with:', { name, activity_id, prize_name, quantity, background_url })

        if (!name || !activity_id) {
            return NextResponse.json({ error: 'Name and activity_id are required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('doorprizes')
            .insert({ 
                name, 
                activity_id, // UUID - no parseInt needed
                prize_name: prize_name || 'Doorprize', 
                quantity: quantity || 1, 
                background_url: background_url || null 
            })
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('POST Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to create doorprize' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, name, activity_id, prize_name, quantity, background_url } = body

        const { data, error } = await supabase
            .from('doorprizes')
            .update({ name, activity_id, prize_name, quantity, background_url })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update doorprize' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const { error } = await supabase
            .from('doorprizes')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete doorprize' }, { status: 500 })
    }
}
