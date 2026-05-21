import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PeriodFilter } from './PeriodFilter'

describe('PeriodFilter', () => {
  it('renders all supported period controls', () => {
    const html = renderToStaticMarkup(
      <PeriodFilter
        value={{ period: '30D', startDate: '', endDate: '' }}
        onChange={vi.fn()}
      />,
    )

    expect(html).toContain('7D')
    expect(html).toContain('30D')
    expect(html).toContain('90D')
    expect(html).toContain('Custom')
    expect(html).toContain('Lifetime')
  })

  it('renders custom date inputs when custom mode is active', () => {
    const html = renderToStaticMarkup(
      <PeriodFilter
        value={{ period: 'Custom', startDate: '2026-03-01', endDate: '2026-03-31' }}
        onChange={vi.fn()}
      />,
    )

    expect(html).toContain('Mulai')
    expect(html).toContain('Selesai')
  })
})
