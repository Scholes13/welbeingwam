import { verifyAdminPermission } from '@/utils/auth'
import { buildWellbeingOverview } from '@/lib/wellbeing'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const permission = 'view_activity'
  const { authorized, errorResponse } = await verifyAdminPermission(permission)
  
  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const payload = await buildWellbeingOverview(searchParams)
  
  return NextResponse.json(payload)
}
