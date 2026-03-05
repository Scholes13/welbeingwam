import type { ComponentType } from 'react'
import { ArrowLeft, Calendar, ClipboardList, FileText, Gift, MapPin, PanelLeftClose, PanelLeftOpen, Shield, User, X } from 'lucide-react'

import type { AdminTab } from './AdminTabs'
import { getAdminSidebarMotionClasses, getAdminSidebarPresentation } from './adminLayout'

type AdminSidebarProps = {
  activeTab: AdminTab
  isOpen: boolean
  isCollapsed: boolean
  onBack: () => void
  onChange: (tab: AdminTab) => void
  onClose: () => void
  onToggleCollapse: () => void
}

type TabGroupKey = 'management' | 'events' | 'system'

type TabItem = {
  key: AdminTab
  label: string
  group: TabGroupKey
  Icon: ComponentType<{ size?: number }>
}

const GROUP_LABELS: Record<TabGroupKey, string> = {
  management: 'Management',
  events: 'Events',
  system: 'System',
}

const GROUP_ORDER: TabGroupKey[] = ['management', 'events', 'system']

const TAB_ITEMS: TabItem[] = [
  { key: 'users', label: 'Users', group: 'management', Icon: User },
  { key: 'quests', label: 'Daily Quests', group: 'management', Icon: Gift },
  { key: 'surveys', label: 'Surveys', group: 'management', Icon: ClipboardList },
  { key: 'rewards', label: 'Rewards', group: 'management', Icon: Gift },
  { key: 'activities', label: 'Activities', group: 'events', Icon: Calendar },
  { key: 'spots', label: 'QR Spots', group: 'events', Icon: MapPin },
  { key: 'doorprize', label: 'Doorprize', group: 'events', Icon: Gift },
  { key: 'templates', label: 'Templates', group: 'management', Icon: FileText },
  { key: 'admins', label: 'Admins', group: 'system', Icon: Shield },
]

type SidebarContentProps = {
  activeTab: AdminTab
  isCollapsed: boolean
  onBack: () => void
  onChange: (tab: AdminTab) => void
  onToggleCollapse?: () => void
}

function SidebarContent({ activeTab, isCollapsed, onBack, onChange, onToggleCollapse }: SidebarContentProps) {
  const presentation = getAdminSidebarPresentation(isCollapsed)
  const motionClasses = getAdminSidebarMotionClasses(isCollapsed)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#FC4C02]/15 p-2">
              <Shield size={18} className="text-[#FC4C02]" />
            </div>
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${motionClasses.brandBlockClass}`}>
              <div className="whitespace-nowrap">
                <div className="text-sm font-bold text-white">Admin Panel</div>
                <div className="text-xs text-gray-500">Classic Navigation</div>
              </div>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white md:flex"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {GROUP_ORDER.map((group) => {
          const items = TAB_ITEMS.filter((item) => item.group === group)
          return (
            <div key={group} className="space-y-2">
              <div className={`overflow-hidden text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 transition-all duration-200 ease-in-out ${motionClasses.groupHeaderClass}`}>
                <span className="whitespace-nowrap">{GROUP_LABELS[group]}</span>
              </div>
              <div className="space-y-1">
                {items.map(({ key, label, Icon }) => {
                  const isActive = activeTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => onChange(key)}
                      className={`relative flex w-full items-center rounded-xl ${presentation.contentPaddingClass} py-2.5 text-sm font-semibold transition-all duration-200 ${presentation.itemJustifyClass} ${motionClasses.itemGapClass} ${
                        isActive
                          ? 'bg-white text-black'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title={presentation.showLabels ? undefined : label}
                      aria-label={presentation.showLabels ? undefined : label}
                    >
                      {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#FC4C02]" />}
                      <Icon size={16} />
                      <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out ${motionClasses.labelClass}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <button
        onClick={onBack}
        className={`mt-6 flex items-center rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-gray-300 transition-all duration-200 hover:bg-white/10 hover:text-white ${presentation.contentPaddingClass} ${presentation.itemJustifyClass} ${motionClasses.itemGapClass}`}
        title={presentation.showLabels ? undefined : 'Back to Dashboard'}
        aria-label={presentation.showLabels ? undefined : 'Back to Dashboard'}
      >
        <ArrowLeft size={16} />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out ${motionClasses.backLabelClass}`}>Back to Dashboard</span>
      </button>
    </div>
  )
}

export function AdminSidebar({ activeTab, isOpen, isCollapsed, onBack, onChange, onClose, onToggleCollapse }: AdminSidebarProps) {
  const presentation = getAdminSidebarPresentation(isCollapsed)

  return (
    <>
      <aside className={`hidden h-screen shrink-0 border-r border-white/10 bg-gradient-to-b from-[#0f0f0f] to-black transition-[width] duration-300 ease-in-out md:block ${presentation.desktopWidthClass}`}>
        <div className="sticky top-0 h-screen p-4">
          <SidebarContent
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onBack={onBack}
            onChange={onChange}
            onToggleCollapse={onToggleCollapse}
          />
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="relative h-full w-[82%] max-w-xs border-r border-white/10 bg-[#070707] p-4 shadow-2xl">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarContent
              activeTab={activeTab}
              isCollapsed={false}
              onBack={() => {
                onClose()
                onBack()
              }}
              onChange={(tab) => {
                onChange(tab)
                onClose()
              }}
            />
          </aside>
        </div>
      )}
    </>
  )
}
