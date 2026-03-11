export type ActivityTypeNode = {
  id: string
  name: string
  description?: string | null
  is_active?: boolean
  parent_type_id?: string | null
}

function normalizeTypeName(name: string): string {
  return name.trim().toLowerCase()
}

export function getTopLevelActivityTypes(types: ActivityTypeNode[]): ActivityTypeNode[] {
  return types.filter((type) => !type.parent_type_id)
}

export function getChildActivityTypes(types: ActivityTypeNode[], parentTypeId: string): ActivityTypeNode[] {
  return types.filter((type) => type.parent_type_id === parentTypeId)
}

export function resolveInitialActivityTypeSelection(types: ActivityTypeNode[]): { parentTypeId: string; typeId: string } {
  const topLevelTypes = getTopLevelActivityTypes(types)
  if (topLevelTypes.length === 0) {
    return { parentTypeId: '', typeId: '' }
  }

  const internal = topLevelTypes.find((type) => normalizeTypeName(type.name) === 'internal activity')
  const selectedParent = internal ?? topLevelTypes[0]
  const children = getChildActivityTypes(types, selectedParent.id)
  const activeChildren = children.filter((child) => child.is_active !== false)
  const selectedChild = activeChildren[0] ?? children[0]

  return {
    parentTypeId: selectedParent.id,
    typeId: selectedChild?.id ?? selectedParent.id,
  }
}

export function resolveTypeBadgeLabel(typeId: string | null | undefined, types: ActivityTypeNode[]): { category: string; subcategory: string | null } {
  if (!typeId) {
    return { category: 'No Type', subcategory: null }
  }

  const selected = types.find((type) => type.id === typeId)
  if (!selected) {
    return { category: 'No Type', subcategory: null }
  }

  if (!selected.parent_type_id) {
    return { category: selected.name, subcategory: null }
  }

  const parent = types.find((type) => type.id === selected.parent_type_id)
  return {
    category: parent?.name ?? 'Unknown Category',
    subcategory: selected.name,
  }
}

export function formatActivityTypeOptionLabel(type: ActivityTypeNode, allTypes: ActivityTypeNode[]): string {
  if (!type.parent_type_id) return type.name
  const parent = allTypes.find((item) => item.id === type.parent_type_id)
  return `${parent?.name ?? 'Category'} / ${type.name}`
}
