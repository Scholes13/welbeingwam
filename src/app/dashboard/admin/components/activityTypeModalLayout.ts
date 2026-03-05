export function getActivityTypeFormGridClass(isHierarchyEnabled: boolean): string {
  if (isHierarchyEnabled) {
    return 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
  }

  return 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
}

export function getActivityTypeModalContainerClass(): string {
  return 'w-full max-w-[960px] max-h-[min(88vh,760px)] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
}

export function getActivityTypeModalListClass(): string {
  return 'min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3'
}
