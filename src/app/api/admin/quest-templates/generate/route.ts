import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'
import { generateQuestsFromTemplates } from '@/lib/quest-templates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const triggerType = body.trigger_type || 'scheduled'
    const activityTypeId = body.activity_type_id

    const result = await generateQuestsFromTemplates(triggerType, activityTypeId)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
