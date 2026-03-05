import { useMemo, useState } from 'react'

type HasId = { id: string }

export function computeNextAllSelection(selectedIds: string[], itemIds: string[]): string[] {
  return selectedIds.length === itemIds.length ? [] : itemIds
}

export function computeNextSingleSelection(selectedIds: string[], id: string): string[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((currentId) => currentId !== id)
    : [...selectedIds, id]
}

export function useUserSelection<T extends HasId>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const itemIds = useMemo(() => items.map((item) => item.id), [items])
  const isAllSelected = itemIds.length > 0 && selectedIds.length === itemIds.length

  const toggleSelectAll = () => {
    setSelectedIds((current) => computeNextAllSelection(current, itemIds))
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((current) => computeNextSingleSelection(current, id))
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  return {
    selectedIds,
    setSelectedIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
  }
}
