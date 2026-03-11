import { describe, expect, it } from 'vitest'

import {
  ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY,
  getAdminCreateLabel,
  getAdminPageMeta,
  getAdminSidebarMotionClasses,
  getAdminSidebarPresentation,
  resolveAdminSidebarCollapsedState,
} from './adminLayout'

describe('adminLayout helpers', () => {
  it('returns contextual create label for each tab', () => {
    expect(getAdminCreateLabel('users', false)).toBe('User')
    expect(getAdminCreateLabel('quests', false)).toBe('Quest')
    expect(getAdminCreateLabel('rewards', false)).toBe('Reward')
    expect(getAdminCreateLabel('activities', false)).toBe('Activity')
    expect(getAdminCreateLabel('spots', false)).toBe('QR Spot')
    expect(getAdminCreateLabel('surveys', false)).toBe('Survey')
    expect(getAdminCreateLabel('surveys', true)).toBe('Question')
    expect(getAdminCreateLabel('doorprize', false)).toBeNull()
    expect(getAdminCreateLabel('admins', false)).toBeNull()
  })

  it('returns stable heading metadata for sidebar layout topbar', () => {
    expect(getAdminPageMeta('users')).toEqual({
      title: 'Users',
      description: 'Manage user accounts, points, and reset actions.',
    })
    expect(getAdminPageMeta('activities')).toEqual({
      title: 'Activities',
      description: 'Manage event schedules, QR attendance, and publication status.',
    })
  })

  it('returns collapsed and expanded sidebar presentation config', () => {
    expect(getAdminSidebarPresentation(false)).toEqual({
      desktopWidthClass: 'w-72',
      showLabels: true,
      showGroupHeaders: true,
      itemJustifyClass: 'justify-start',
      contentPaddingClass: 'px-3',
    })

    expect(getAdminSidebarPresentation(true)).toEqual({
      desktopWidthClass: 'w-20',
      showLabels: false,
      showGroupHeaders: false,
      itemJustifyClass: 'justify-center',
      contentPaddingClass: 'px-2',
    })
  })

  it('resolves persisted sidebar collapse state safely', () => {
    expect(resolveAdminSidebarCollapsedState('1')).toBe(true)
    expect(resolveAdminSidebarCollapsedState('0')).toBe(false)
    expect(resolveAdminSidebarCollapsedState(null)).toBe(false)
    expect(resolveAdminSidebarCollapsedState('unexpected')).toBe(false)
  })

  it('uses stable storage key for sidebar preference', () => {
    expect(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY).toBe('admin.sidebar.collapsed')
  })

  it('returns motion classes for collapsed and expanded sidebar labels', () => {
    expect(getAdminSidebarMotionClasses(false)).toEqual({
      brandBlockClass: 'max-w-[180px] opacity-100 translate-x-0',
      groupHeaderClass: 'max-h-6 opacity-100 translate-x-0 px-3',
      labelClass: 'max-w-[160px] opacity-100 translate-x-0',
      itemGapClass: 'gap-3',
      backLabelClass: 'max-w-[140px] opacity-100 translate-x-0',
    })

    expect(getAdminSidebarMotionClasses(true)).toEqual({
      brandBlockClass: 'max-w-0 opacity-0 -translate-x-1',
      groupHeaderClass: 'max-h-0 opacity-0 -translate-x-1 px-0',
      labelClass: 'max-w-0 opacity-0 -translate-x-1',
      itemGapClass: 'gap-0',
      backLabelClass: 'max-w-0 opacity-0 -translate-x-1',
    })
  })
})
