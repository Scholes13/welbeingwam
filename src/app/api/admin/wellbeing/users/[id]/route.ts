import { buildWellbeingUserDetail } from '@/lib/wellbeing'
import { verifyAdminPermission } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { authorized, errorResponse } = await verifyAdminPermission('view_activity')

  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)

    const payload = await buildWellbeingUserDetail({
      userId: id,
      searchParams,
    })

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user wellbeing detail'
    const status = message === 'User not found'
      ? 404
      : message === 'Invalid custom wellbeing range' || message === 'Invalid user id'
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
