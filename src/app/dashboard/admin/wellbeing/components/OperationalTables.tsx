import type { WellbeingOverviewPayload, UserSummary } from '@/lib/wellbeing/types'
import { formatDimensionLabel } from '../utils'
import { InfoTooltip } from './InfoTooltip'

type OperationalTablesProps = {
  onSelectUser: (userId: number) => void
  selectedUserId: number | null
  tables: WellbeingOverviewPayload['operationalTables']
}

type TableMetric = 'wellbeingIndex' | 'attendanceCount' | 'indexDelta'

type TableConfig = {
  key: keyof WellbeingOverviewPayload['operationalTables']
  label: string
  description: string
  emptyMessage: string
  metric: TableMetric
}

const TABLE_CONFIG: TableConfig[] = [
  {
    key: 'mostActive',
    label: 'Most Active',
    description: 'Wellbeing index tertinggi di periode aktif',
    emptyMessage: 'Belum ada user aktif untuk periode ini.',
    metric: 'wellbeingIndex',
  },
  {
    key: 'highestAttendance',
    label: 'Highest Attendance',
    description: 'Check-in terbanyak di periode ini',
    emptyMessage: 'Belum ada check-in pada periode ini.',
    metric: 'attendanceCount',
  },
  {
    key: 'biggestDrop',
    label: 'Biggest Drop',
    description: 'Penurunan vs periode sebelumnya',
    emptyMessage: 'Belum ada penurunan signifikan.',
    metric: 'indexDelta',
  },
]

function describeDimension(row: UserSummary): { label: string; muted: boolean } {
  const totalActivity = row.activityCount + row.attendanceCount + row.quizCount + row.sportCount
  if (row.dominantDimension && row.dominantDimension !== 'unknown') {
    return { label: formatDimensionLabel(row.dominantDimension), muted: false }
  }
  if (totalActivity === 0) return { label: 'Belum ada aktivitas', muted: true }
  return { label: 'Belum cukup data', muted: true }
}

function metricValue(row: UserSummary, metric: TableMetric): { primary: string; secondary: string } {
  if (metric === 'attendanceCount') {
    return {
      primary: String(row.attendanceCount),
      secondary: row.attendanceCount === 1 ? 'check-in' : 'check-ins',
    }
  }
  if (metric === 'indexDelta' && typeof row.indexDelta === 'number') {
    const formatted = row.indexDelta > 0 ? `+${row.indexDelta}` : String(row.indexDelta)
    const previous = typeof row.previousIndex === 'number' ? row.previousIndex : null
    return {
      primary: formatted,
      secondary: previous != null ? `${previous} → ${row.wellbeingIndex}` : 'index delta',
    }
  }
  return { primary: String(row.wellbeingIndex), secondary: 'index' }
}

export function OperationalTables({ onSelectUser, selectedUserId, tables }: OperationalTablesProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-white">Users Worth Reviewing Next</h3>
        <InfoTooltip text="Klik salah satu kartu untuk membuka drill-down user. Q = quiz, S = sport, A = attendance." />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {TABLE_CONFIG.map((table) => {
          const rows = tables[table.key]
          return (
            <div key={table.key} className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0c0c0c]">
              <div className="flex items-baseline justify-between border-b border-white/[0.04] px-4 py-3">
                <div>
                  <p className="text-[13px] font-bold text-white">{table.label}</p>
                  <p className="text-[10px] text-gray-500">{table.description}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">{rows.length}</span>
              </div>

              {rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-gray-500">{table.emptyMessage}</p>
              ) : (
                <ul className="max-h-[420px] divide-y divide-white/[0.04] overflow-y-auto">
                  {rows.map((row) => {
                    const isSelected = selectedUserId === row.userId
                    const dimension = describeDimension(row)
                    const metric = metricValue(row, table.metric)
                    return (
                      <li key={`${table.key}-${row.userId}`}>
                        <button
                          type="button"
                          onClick={() => onSelectUser(row.userId)}
                          className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                            isSelected ? 'bg-[#FC4C02]/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {row.username || `User #${row.userId}`}
                            </div>
                            <div className={`mt-0.5 text-[11px] ${dimension.muted ? 'text-gray-600' : 'text-gray-500'}`}>
                              {dimension.label}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-gray-500">
                              <span>Q{row.quizCount}</span>
                              <span>·</span>
                              <span>S{row.sportCount}</span>
                              <span>·</span>
                              <span>A{row.attendanceCount}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums text-[#FC4C02]">{metric.primary}</div>
                            <div className="text-[10px] text-gray-500">{metric.secondary}</div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
