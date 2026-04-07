import type { WellbeingOverviewPayload } from '../types'
import { formatDimensionLabel } from '../utils'

type DimensionDistributionProps = {
  items: WellbeingOverviewPayload['dimensionDistribution']
}

export function DimensionDistribution({ items }: DimensionDistributionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">Dominant Dimensions</p>
          <h3 className="mt-2 text-xl font-bold text-white">Where Users Are Leaning</h3>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-gray-500">
          Overview
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-gray-500">
          Belum ada distribusi wellbeing yang bisa dirangkum untuk periode ini.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={item.dimension} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{formatDimensionLabel(item.dimension)}</span>
                <span className="text-gray-400">{item.userCount} users / {item.percentage}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FC4C02] to-orange-300"
                  style={{ width: `${Math.max(item.percentage, 6)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
