import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// Helper to check if user is admin
async function checkAdmin() {
  const cookieStore = await cookies()
  const participantId = cookieStore.get('participant_id')?.value

  if (!participantId) {
    return { isAdmin: false, participantId: null }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: participant } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('id', participantId)
    .single()

  return {
    isAdmin: participant?.is_admin || false,
    participantId
  }
}

// GET - List all categories
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new category
export async function POST(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, icon_url, color, sort_order } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        icon_url: icon_url || null,
        color: color || '#FC4C02',
        sort_order: sort_order !== undefined ? sort_order : 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, icon_url, color, sort_order } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build update object with only provided fields
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (icon_url !== undefined) updates.icon_url = icon_url
    if (color !== undefined) updates.color = color
    if (sort_order !== undefined) updates.sort_order = sort_order

    const { data: category, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete category
export async function DELETE(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if category is in use by any quest spots
    const { data: spots, error: checkError } = await supabase
      .from('quest_spots')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking category usage:', checkError)
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 }
      )
    }

    if (spots && spots.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that is in use by quest spots' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
