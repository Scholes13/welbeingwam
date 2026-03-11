export function getCreateActivityModalContainerClass(): string {
  return 'w-full max-w-[760px] max-h-[min(90vh,860px)] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
}

export function getCreateActivityModalHeaderClass(): string {
  return 'sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#121212] px-4 py-3 sm:px-6 sm:py-4'
}

export function getCreateActivityModalFormClass(): string {
  return 'flex max-h-[calc(90vh-72px)] flex-col gap-4 overflow-y-auto p-4 sm:p-6'
}

export function getCreateActivityTypeGridClass(isHierarchyEnabled: boolean): string {
  if (isHierarchyEnabled) return 'grid grid-cols-1 gap-3 md:grid-cols-2'
  return 'grid grid-cols-1 gap-3'
}

export function getCreateActivityTimeGridClass(): string {
  return 'grid grid-cols-1 gap-3 sm:grid-cols-2'
}
