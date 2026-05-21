import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { OperationalTables } from './OperationalTables'

describe('OperationalTables', () => {
  it('renders rows and the empty-state fallback', () => {
    const html = renderToStaticMarkup(
      <OperationalTables
        selectedUserId={11}
        onSelectUser={vi.fn()}
        tables={{
          mostActive: [
            {
              userId: 11,
              username: 'andi',
              wellbeingIndex: 78,
              dominantDimension: 'physical',
              quizCount: 2,
              sportCount: 4,
              attendanceCount: 5,
              activityCount: 6,
            },
          ],
          highestAttendance: [
            {
              userId: 19,
              username: 'sinta',
              wellbeingIndex: 70,
              dominantDimension: 'social',
              quizCount: 1,
              sportCount: 0,
              attendanceCount: 8,
              activityCount: 1,
            },
          ],
          biggestDrop: [],
        }}
      />,
    )

    expect(html).toContain('Most Active')
    expect(html).toContain('andi')
    expect(html).toContain('Highest Attendance')
    expect(html).toContain('sinta')
    expect(html).toContain('Biggest Drop')
    expect(html).toContain('Belum ada penurunan signifikan')
    expect(html).toContain('Q2')
    expect(html).toContain('A8')
  })
})
