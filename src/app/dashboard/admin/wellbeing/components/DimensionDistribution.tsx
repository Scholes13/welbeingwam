import type { WellbeingOverviewPayload } from '../types'
import { formatDimensionLabel } from '../utils'

type DimensionDistributionProps = {
  items: WellbeingOverviewPayload['dimensionDistribution']
}

export function DimensionDistribution({ items }: DimensionDistributionProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-white">Where Users Are Leaning</h3>
        <p className="text-[11px] text-gray-500">{items.length} dimensi</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada distribusi yang bisa dirangkum untuk periode ini.</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-4">
          {items.map((item) => (
            <div key={item.dimension} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-200">{formatDimensionLabel(item.dimension)}</span>
                <span className="tabular-nums text-gray-500">{item.userCount} users · {item.percentage}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full bg-gradient-to-r from-[#FC4C02] to-orange-300"
                  style={{ width: `${Math.max(item.percentage, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
