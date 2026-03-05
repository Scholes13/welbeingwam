import type { ActivityTypeNode } from './activityTypeHierarchy'

const DEFAULT_TOP_LEVEL_CATEGORIES = ['Internal Activity', 'External Activity', 'Community Activity'] as const

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function getMissingDefaultTopCategories(types: ActivityTypeNode[]): string[] {
  const existingTopLevel = new Set(
    types
      .filter((type) => !type.parent_type_id)
      .map((type) => normalizeName(type.name)),
  )

  return DEFAULT_TOP_LEVEL_CATEGORIES.filter((category) => !existingTopLevel.has(normalizeName(category)))
}
