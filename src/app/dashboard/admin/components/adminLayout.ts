import type { AdminTab } from './AdminTabs'

type AdminPageMeta = {
  title: string
  description: string
}

export type AdminSidebarPresentation = {
  desktopWidthClass: string
  showLabels: boolean
  showGroupHeaders: boolean
  itemJustifyClass: string
  contentPaddingClass: string
}

export type AdminSidebarMotionClasses = {
  brandBlockClass: string
  groupHeaderClass: string
  labelClass: string
  itemGapClass: string
  backLabelClass: string
}

export const ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY = 'admin.sidebar.collapsed'

const PAGE_META: Record<AdminTab, AdminPageMeta> = {
  users: {
    title: 'Users',
    description: 'Manage user accounts, points, and reset actions.',
  },
  wellbeing: {
    title: 'Wellbeing Dashboard',
    description: 'Monitor user wellbeing index, dominant dimensions, and attention-needed trends.',
  },
  quests: {
    title: 'Daily Quests',
    description: 'Manage daily mission templates and reward points.',
  },
  surveys: {
    title: 'Surveys',
    description: 'Create surveys, configure questions, and monitor reports.',
  },
  rewards: {
    title: 'Rewards',
    description: 'Manage redeemable rewards and claim history.',
  },
  activities: {
    title: 'Activities',
    description: 'Manage event schedules, QR attendance, and publication status.',
  },
  sports: {
    title: 'Sport Sessions',
    description: 'Review manual sport submissions, inspect proofs, and void abusive activity points.',
  },
  spots: {
    title: 'QR Spots',
    description: 'Manage spot codes, claims, and activity status.',
  },
  doorprize: {
    title: 'Doorprize',
    description: 'Create sessions, configure prizes, and review winners.',
  },
  admins: {
    title: 'Admins',
    description: 'Manage admin access and permissions.',
  },
  templates: {
    title: 'Quest Templates',
    description: 'Manage recurring quest templates and auto-generation.',
  },
  streaks: {
    title: 'Streak Events',
    description: 'Manage streak challenges with multiplier rewards.',
  },
}

export function getAdminPageMeta(activeTab: AdminTab): AdminPageMeta {
  return PAGE_META[activeTab]
}

export function getAdminCreateLabel(activeTab: AdminTab, hasSelectedSurvey: boolean): string | null {
  if (
    activeTab === 'admins' ||
    activeTab === 'doorprize' ||
    activeTab === 'templates' ||
    activeTab === 'sports' ||
    activeTab === 'wellbeing'
  ) return null
  if (activeTab === 'users') return 'User'
  if (activeTab === 'quests') return 'Quest'
  if (activeTab === 'rewards') return 'Reward'
  if (activeTab === 'activities') return 'Activity'
  if (activeTab === 'spots') return 'QR Spot'
  if (activeTab === 'surveys') return hasSelectedSurvey ? 'Question' : 'Survey'
  return null
}

export function getAdminSidebarPresentation(isCollapsed: boolean): AdminSidebarPresentation {
  if (isCollapsed) {
    return {
      desktopWidthClass: 'w-20',
      showLabels: false,
      showGroupHeaders: false,
      itemJustifyClass: 'justify-center',
      contentPaddingClass: 'px-2',
    }
  }

  return {
    desktopWidthClass: 'w-72',
    showLabels: true,
    showGroupHeaders: true,
    itemJustifyClass: 'justify-start',
    contentPaddingClass: 'px-3',
  }
}

export function resolveAdminSidebarCollapsedState(rawValue: string | null): boolean {
  return rawValue === '1'
}

export function getAdminSidebarMotionClasses(isCollapsed: boolean): AdminSidebarMotionClasses {
  if (isCollapsed) {
    return {
      brandBlockClass: 'max-w-0 opacity-0 -translate-x-1',
      groupHeaderClass: 'max-h-0 opacity-0 -translate-x-1 px-0',
      labelClass: 'max-w-0 opacity-0 -translate-x-1',
      itemGapClass: 'gap-0',
      backLabelClass: 'max-w-0 opacity-0 -translate-x-1',
    }
  }

  return {
    brandBlockClass: 'max-w-[180px] opacity-100 translate-x-0',
    groupHeaderClass: 'max-h-6 opacity-100 translate-x-0 px-3',
    labelClass: 'max-w-[160px] opacity-100 translate-x-0',
    itemGapClass: 'gap-3',
    backLabelClass: 'max-w-[140px] opacity-100 translate-x-0',
  }
}
