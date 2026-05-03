import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { isDowngradeMode } from '@/lib/downgrade'

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
  // Downgrade mode: skip quest auto-generation
  if (isDowngradeMode()) {
    return { generated: 0, skipped: true, reason: 'downgrade_mode' }
  }

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

  // Batch-fetch all quests created today for the relevant templates (fixes N+1)
  const templateIds = (templates as QuestTemplate[]).map((t) => t.id)
  const { data: existingQuests } = await supabase
    .from('quests')
    .select('template_id')
    .in('template_id', templateIds)
    .gte('created_at', `${today}T00:00:00Z`)
    .lte('created_at', `${today}T23:59:59Z`)

  const existingTemplateIds = new Set(
    (existingQuests ?? []).map((q: { template_id: string }) => q.template_id),
  )

  for (const template of templates as QuestTemplate[]) {
    if (triggerType === 'scheduled') {
      const dayOfWeek = now.getDay()
      const dayOfMonth = now.getDate()

      if (template.recurrence === 'weekly' && dayOfWeek !== 1) continue
      if (template.recurrence === 'monthly' && dayOfMonth !== 1) continue
    }

    // Check if quest from this template already exists today
    if (existingTemplateIds.has(template.id)) continue

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
