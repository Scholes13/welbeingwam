import type { WellbeingOverviewPayload } from '../types'
import { InfoTooltip } from './InfoTooltip'

type AttentionPanelProps = {
  counts: WellbeingOverviewPayload['attentionCounts']
}

const ATTENTION_ITEMS = [
  { key: 'noRecentQuiz',  label: 'No Recent Quiz', tone: 'text-amber-300',  hint: 'Belum submit survei di periode ini.' },
  { key: 'lowAttendance', label: 'Low Attendance', tone: 'text-orange-300', hint: 'Hadir di kurang dari 3 event.' },
  { key: 'fallingSport',  label: 'Falling Sport',  tone: 'text-sky-300',    hint: 'Aktivitas sport menurun (perlu data prior period).' },
  { key: 'inactive',      label: 'Inactive Users', tone: 'text-rose-300',   hint: 'Tidak ada aktivitas apa pun di periode ini.' },
] as const

export function AttentionPanel({ counts }: AttentionPanelProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-white">Operational Watchlist</h3>
        <InfoTooltip text="Daftar jumlah karyawan yang perlu perhatian operasional di periode ini." />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-4">
        {ATTENTION_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 bg-[#0c0c0c] p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-gray-500">{item.label}</span>
                <InfoTooltip text={item.hint} />
              </div>
              <p className="mt-1 text-[11px] text-gray-600 line-clamp-1">{item.hint}</p>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${item.tone}`}>{counts[item.key]}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
