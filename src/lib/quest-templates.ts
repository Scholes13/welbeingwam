import { createSupabaseAdminClient } from '@/lib/supabase/server'

interface QuestTemplate {
  id: string
  title: string
  description: string | null
  dimension_id: string | null
  points: number
  verification_type: string
  requires_photo: boolean
  recurrence: string
  trigger_type: string
  linked_activity_type_id: string | null
}

export async function generateQuestsFromTemplates(triggerType: 'scheduled' | 'activity_linked', activityTypeId?: string) {
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('quest_templates')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', triggerType)

  if (triggerType === 'activity_linked' && activityTypeId) {
    query = query.eq('linked_activity_type_id', activityTypeId)
  }

  const { data: templates, error } = await query

  if (error || !templates?.length) return { generated: 0, error: error?.message }

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const questsToInsert = []

  for (const template of templates as QuestTemplate[]) {
    if (triggerType === 'scheduled') {
      const dayOfWeek = now.getDay()
      const dayOfMonth = now.getDate()

      if (template.recurrence === 'weekly' && dayOfWeek !== 1) continue
      if (template.recurrence === 'monthly' && dayOfMonth !== 1) continue
    }

    // Check if quest from this template already exists today
    const { data: existing } = await supabase
      .from('quests')
      .select('id')
      .eq('template_id', template.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)
      .limit(1)

    if (existing && existing.length > 0) continue

    let expiresAt: string | null = null
    if (template.recurrence === 'daily') {
      expiresAt = `${today}T23:59:59Z`
    } else if (template.recurrence === 'weekly') {
      const endOfWeek = new Date(now)
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
      expiresAt = endOfWeek.toISOString()
    } else if (template.recurrence === 'monthly') {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      expiresAt = endOfMonth.toISOString()
    }

    questsToInsert.push({
      title: template.title,
      description: template.description,
      points: template.points,
      dimension_id: template.dimension_id,
      verification_type: template.verification_type,
      requires_photo: template.requires_photo,
      template_id: template.id,
      is_active: true,
      expires_at: expiresAt,
    })
  }

  if (questsToInsert.length === 0) return { generated: 0 }

  const { error: insertError } = await supabase
    .from('quests')
    .insert(questsToInsert)

  if (insertError) return { generated: 0, error: insertError.message }

  return { generated: questsToInsert.length }
}
