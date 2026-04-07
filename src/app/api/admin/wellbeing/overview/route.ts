import { buildWellbeingOverview } from '@/lib/wellbeing'
import { verifyAdminPermission } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const permission = 'view_activity'
  const { authorized, errorResponse } = await verifyAdminPermission(permission)

  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const payload = await buildWellbeingOverview(searchParams)

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load wellbeing overview'
    const status = message === 'Invalid custom wellbeing range' ? 400 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
