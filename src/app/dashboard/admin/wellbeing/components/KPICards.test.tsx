import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { KPICards } from './KPICards'

describe('KPICards', () => {
  it('renders the headline metrics and warning banner', () => {
    const html = renderToStaticMarkup(
      <KPICards
        payload={{
          meta: {
            appliedPeriod: '30D',
            periodStart: '2026-03-01T00:00:00.000Z',
            periodEnd: '2026-03-31T00:00:00.000Z',
            priorPeriodStart: '2026-01-30T00:00:00.000Z',
            priorPeriodEnd: '2026-02-28T00:00:00.000Z',
            warnings: ['Quiz coverage is sparse; wellbeing scores may have limited confidence'],
          },
          kpis: {
            activeUsersPercent: 78,
            averageWellbeingIndex: 64,
            quizCoveragePercent: 29,
            attendanceRatePercent: 56,
          },
          dimensionDistribution: [],
          attentionCounts: {
            noRecentQuiz: 10,
            lowAttendance: 5,
            fallingSport: 2,
            inactive: 4,
          },
          operationalTables: {
            mostActive: [],
            highestAttendance: [],
            biggestDrop: [],
          },
        }}
      />,
    )

    expect(html).toContain('Active Users')
    expect(html).toContain('78%')
    expect(html).toContain('Average Wellbeing Index')
    expect(html).toContain('64')
    expect(html).toContain('Data Caveats')
    expect(html).toContain('Quiz coverage is sparse')
  })
})
