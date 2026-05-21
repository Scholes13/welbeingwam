import { TrendingUp, AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import type { InsightItem } from '@/lib/wellbeing/types'

type InsightsPanelProps = {
  insights: InsightItem[]
}

const SEVERITY_STYLE: Record<InsightItem['severity'], { Icon: LucideIcon; iconFg: string }> = {
  success: { Icon: TrendingUp,    iconFg: 'text-emerald-400' },
  warning: { Icon: AlertTriangle, iconFg: 'text-amber-400' },
  info:    { Icon: Info,          iconFg: 'text-sky-400' },
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-white">Alert &amp; Insight</h3>

      {insights.length === 0 ? (
        <p className="text-sm text-gray-500">Tidak ada anomali signifikan terdeteksi.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#0c0c0c]">
          {insights.map((insight) => {
            const style = SEVERITY_STYLE[insight.severity]
            const Icon = style.Icon
            return (
              <li key={insight.id} className="flex items-start gap-3 p-4">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconFg}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{insight.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
