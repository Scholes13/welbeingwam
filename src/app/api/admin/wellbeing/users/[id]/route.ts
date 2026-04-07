import { verifyAdminPermission } from '@/utils/auth'
import { buildWellbeingUserDetail } from '@/lib/wellbeing'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { authorized, errorResponse } = await verifyAdminPermission('view_activity')
  
  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  
  const payload = await buildWellbeingUserDetail({
    userId: id,
    searchParams,
  })

  return NextResponse.json(payload)
}