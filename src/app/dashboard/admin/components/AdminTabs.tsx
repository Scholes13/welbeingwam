import type { ComponentType } from 'react'
import { Calendar, ClipboardList, Gift, MapPin, Shield, User, FileText, Flame } from 'lucide-react'

export type AdminTab =
  | 'users'
  | 'quests'
  | 'surveys'
  | 'rewards'
  | 'activities'
  | 'spots'
  | 'doorprize'
  | 'admins'
  | 'templates'
  | 'streaks'

type AdminTabsProps = {
  activeTab: AdminTab
  onChange: (tab: AdminTab) => void
}

const TAB_CONFIG: { key: AdminTab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { key: 'users', label: 'Users', Icon: User },
  { key: 'quests', label: 'Daily Quests', Icon: Gift },
  { key: 'surveys', label: 'Surveys', Icon: ClipboardList },
  { key: 'rewards', label: 'Rewards', Icon: Gift },
  { key: 'activities', label: 'Activities', Icon: Calendar },
  { key: 'spots', label: 'QR Spots', Icon: MapPin },
  { key: 'doorprize', label: 'Doorprize', Icon: Gift },
  { key: 'admins', label: 'Admins', Icon: Shield },
  { key: 'templates', label: 'Templates', Icon: FileText },
  { key: 'streaks', label: 'Streaks', Icon: Flame },
]

export function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="flex gap-2 md:gap-4 mb-6 overflow-x-auto pb-2 scrollbar-none">
      {TAB_CONFIG.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${
            activeTab === key ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          } `}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </div>
  )
}
