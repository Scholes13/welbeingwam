import { describe, expect, it } from 'vitest'

import {
  getActivityTypeFormGridClass,
  getActivityTypeModalContainerClass,
  getActivityTypeModalListClass,
} from './activityTypeModalLayout'

describe('activityTypeModalLayout helpers', () => {
  it('returns compact responsive grid classes for hierarchy and fallback modes', () => {
    expect(getActivityTypeFormGridClass(true)).toBe('grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]')
    expect(getActivityTypeFormGridClass(false)).toBe('grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]')
  })

  it('returns safe viewport container and list sizing classes', () => {
    expect(getActivityTypeModalContainerClass()).toBe('w-full max-w-[960px] max-h-[min(88vh,760px)] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.55)]')
    expect(getActivityTypeModalListClass()).toBe('min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3')
  })
})
