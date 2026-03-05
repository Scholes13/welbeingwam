import { describe, expect, it } from 'vitest'

import {
  getCreateActivityModalContainerClass,
  getCreateActivityModalFormClass,
  getCreateActivityModalHeaderClass,
  getCreateActivityTimeGridClass,
  getCreateActivityTypeGridClass,
} from './createActivityModalLayout'

describe('createActivityModalLayout helpers', () => {
  it('returns safe viewport and sticky header classes', () => {
    expect(getCreateActivityModalContainerClass()).toBe('w-full max-w-[760px] max-h-[min(90vh,860px)] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.55)]')
    expect(getCreateActivityModalHeaderClass()).toBe('sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#121212] px-4 py-3 sm:px-6 sm:py-4')
    expect(getCreateActivityModalFormClass()).toBe('flex max-h-[calc(90vh-72px)] flex-col gap-4 overflow-y-auto p-4 sm:p-6')
  })

  it('returns adaptive type and time grid classes', () => {
    expect(getCreateActivityTypeGridClass(true)).toBe('grid grid-cols-1 gap-3 md:grid-cols-2')
    expect(getCreateActivityTypeGridClass(false)).toBe('grid grid-cols-1 gap-3')
    expect(getCreateActivityTimeGridClass()).toBe('grid grid-cols-1 gap-3 sm:grid-cols-2')
  })
})
