type ActivityTypePayload = {
  name: string
  description: string | null
  parentTypeId: string | null
}

export function buildActivityTypePayload(
  rawName: string,
  rawDescription: string,
  rawParentTypeId?: string | null,
): ActivityTypePayload | null {
  const name = rawName.trim()
  if (!name) return null

  const description = rawDescription.trim()
  const parentTypeId = (rawParentTypeId || '').trim()

  return {
    name,
    description: description || null,
    parentTypeId: parentTypeId || null,
  }
}

export function shouldSubmitActivityTypeByKey(key: string): boolean {
  return key === 'Enter' || key === 'NumpadEnter'
}
