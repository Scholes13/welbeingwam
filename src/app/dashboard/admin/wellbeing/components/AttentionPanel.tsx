import type { WellbeingOverviewPayload } from '../types'

type AttentionPanelProps = {
  counts: WellbeingOverviewPayload['attentionCounts']
}

const ATTENTION_ITEMS = [
  {
    key: 'noRecentQuiz',
    label: 'No Recent Quiz',
    hint: 'Users have no quiz submission in the filtered period.',
    tone: 'text-amber-300',
  },
  {
    key: 'lowAttendance',
    label: 'Low Attendance',
    hint: 'Users joined fewer than three attendance moments.',
    tone: 'text-orange-300',
  },
  {
    key: 'fallingSport',
    label: 'Falling Sport',
    hint: 'Users with sports activity trending down once the backend comparison is ready.',
    tone: 'text-sky-300',
  },
  {
    key: 'inactive',
    label: 'Inactive',
    hint: 'Users with no meaningful action in this period.',
    tone: 'text-rose-300',
  },
] as const

export function AttentionPanel({ counts }: AttentionPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">Needs Attention</p>
      <h3 className="mt-2 text-xl font-bold text-white">Operational Watchlist</h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ATTENTION_ITEMS.map((item) => (
          <div key={item.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{item.label}</div>
            <div className={`mt-3 text-3xl font-bold ${item.tone}`}>{counts[item.key]}</div>
            <p className="mt-2 text-sm text-gray-400">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
