import { ADMIN_TAB_CONFIG, type AdminTab } from './adminLayout'

export type { AdminTab }

type AdminTabsProps = {
  activeTab: string
  onChange: (tab: string) => void
}


export function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="flex gap-2 md:gap-4 mb-6 overflow-x-auto pb-2 scrollbar-none">
      {ADMIN_TAB_CONFIG.map(({ key, label, Icon }) => (
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
