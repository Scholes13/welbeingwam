import type { WellbeingOverviewPayload } from '../types'
import { formatDimensionLabel } from '../utils'

type OperationalTablesProps = {
  onSelectUser: (userId: number) => void
  selectedUserId: number | null
  tables: WellbeingOverviewPayload['operationalTables']
}

const TABLE_CONFIG = [
  {
    key: 'mostActive',
    label: 'Most Active',
    emptyMessage: 'No active users matched this period yet.',
  },
  {
    key: 'highestAttendance',
    label: 'Highest Attendance',
    emptyMessage: 'Attendance rankings will appear once check-ins land in the selected period.',
  },
  {
    key: 'biggestDrop',
    label: 'Biggest Drop',
    emptyMessage: 'Trend comparison rows will appear after prior-period drop detection is added.',
  },
] as const

export function OperationalTables({ onSelectUser, selectedUserId, tables }: OperationalTablesProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">Operational Tables</p>
        <h3 className="mt-2 text-xl font-bold text-white">Users Worth Reviewing Next</h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {TABLE_CONFIG.map((table) => {
          const rows = tables[table.key]

          return (
            <div key={table.key} className="rounded-2xl border border-white/10 bg-[#111111] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-lg font-bold text-white">{table.label}</div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-gray-500">
                  {rows.length}
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                  {table.emptyMessage}
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => {
                    const isSelected = selectedUserId === row.userId

                    return (
                      <button
                        key={`${table.key}-${row.userId}`}
                        type="button"
                        onClick={() => onSelectUser(row.userId)}
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-[#FC4C02] bg-[#FC4C02]/10'
                            : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-white">{row.username}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">
                              {formatDimensionLabel(row.dominantDimension)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#FC4C02]">{row.wellbeingIndex}</div>
                            <div className="text-xs text-gray-500">index</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
