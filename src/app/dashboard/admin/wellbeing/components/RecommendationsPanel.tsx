import { ChevronRight, Lightbulb } from 'lucide-react'
import type { RecommendationItem } from '@/lib/wellbeing/types'

type RecommendationsPanelProps = {
  recommendations: RecommendationItem[]
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-white">Rekomendasi Tindakan</h3>

      <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#0c0c0c]">
        {recommendations.map((rec) => (
          <li key={rec.id} className="flex items-start gap-3 p-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#FC4C02]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{rec.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{rec.body}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-700" />
          </li>
        ))}
      </ul>
    </section>
  )
}
