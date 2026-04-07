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
            },
          ],
          highestAttendance: [
            {
              userId: 19,
              username: 'sinta',
              wellbeingIndex: 70,
              dominantDimension: 'social',
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
    expect(html).toContain('Trend comparison rows will appear')
  })
})
