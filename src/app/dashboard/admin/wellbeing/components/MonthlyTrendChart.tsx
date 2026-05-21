import type { MonthlyTrendPoint, DimensionScore } from '@/lib/wellbeing/types'
import { InfoTooltip } from './InfoTooltip'

type MonthlyTrendChartProps = {
  trend: MonthlyTrendPoint[]
  dimensions: DimensionScore[]
}

const DIMENSION_STROKE: Record<string, string> = {
  physical:  '#fb923c',
  emotional: '#fb7185',
  social:    '#38bdf8',
  financial: '#34d399',
  spiritual: '#fbbf24',
}

const FALLBACK_STROKE = '#9ca3af'

function strokeFor(name: string) {
  return DIMENSION_STROKE[name] ?? FALLBACK_STROKE
}

const VIEW_W = 760
const VIEW_H = 240
const PAD_X = 36
const PAD_Y = 18
const PLOT_W = VIEW_W - PAD_X * 2
const PLOT_H = VIEW_H - PAD_Y * 2

function buildPath(points: number[]): string {
  if (points.length === 0) return ''
  const stepX = points.length > 1 ? PLOT_W / (points.length - 1) : 0
  return points
    .map((value, index) => {
      const x = PAD_X + stepX * index
      const y = PAD_Y + PLOT_H - (value / 100) * PLOT_H
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function MonthlyTrendChart({ trend, dimensions }: MonthlyTrendChartProps) {
  const hasAnyData = trend.some((point) => point.overall > 0 || Object.values(point.byDimension).some((v) => v > 0))

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-white">Tren 12 Bulan</h3>
          <InfoTooltip text="Tiap bulan, dihitung % karyawan unik yang punya minimal satu kegiatan di dimensi tersebut. Tiap warna mewakili satu dimensi wellbeing." />
        </div>
        <p className="text-[11px] text-gray-500">% partisipasi karyawan per dimensi</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-4">
        {!hasAnyData ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Belum ada data aktivitas untuk 12 bulan terakhir.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                role="img"
                aria-label="Tren wellbeing per dimensi 12 bulan"
                className="block h-60 w-full min-w-[640px]"
              >
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = PAD_Y + PLOT_H - (tick / 100) * PLOT_H
                  return (
                    <g key={tick}>
                      <line
                        x1={PAD_X}
                        x2={PAD_X + PLOT_W}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <text
                        x={PAD_X - 8}
                        y={y + 3}
                        fontSize="9"
                        fill="rgba(255,255,255,0.3)"
                        textAnchor="end"
                      >
                        {tick}
                      </text>
                    </g>
                  )
                })}

                {trend.map((point, index) => {
                  const stepX = trend.length > 1 ? PLOT_W / (trend.length - 1) : 0
                  const x = PAD_X + stepX * index
                  return (
                    <text
                      key={point.monthKey}
                      x={x}
                      y={VIEW_H - 4}
                      fontSize="9"
                      fill="rgba(255,255,255,0.3)"
                      textAnchor="middle"
                    >
                      {point.monthLabel}
                    </text>
                  )
                })}

                {dimensions.map((dim) => {
                  const series = trend.map((point) => point.byDimension[dim.name] ?? 0)
                  const path = buildPath(series)
                  const stroke = strokeFor(dim.name)
                  return (
                    <g key={dim.dimensionId}>
                      <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
                      {series.map((value, index) => {
                        const stepX = trend.length > 1 ? PLOT_W / (trend.length - 1) : 0
                        const x = PAD_X + stepX * index
                        const y = PAD_Y + PLOT_H - (value / 100) * PLOT_H
                        return (
                          <circle key={`${dim.dimensionId}-${index}`} cx={x} cy={y} r={2} fill={stroke} />
                        )
                      })}
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-400">
              {dimensions.map((dim) => (
                <div key={dim.dimensionId} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: strokeFor(dim.name) }}
                  />
                  <span>{dim.displayName}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
