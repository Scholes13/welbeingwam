export type WellbeingPeriodKind = '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'

export type WellbeingPeriod = {
  kind: WellbeingPeriodKind
  start: Date | null
  end: Date
}

export function parseWellbeingPeriod(searchParams: URLSearchParams): WellbeingPeriod {
  const raw = searchParams.get('period') ?? '30D'
  
  if (raw === 'Lifetime') {
    return { kind: 'Lifetime' as const, start: null, end: new Date() }
  }
  
  if (raw === 'Custom') {
    const start = new Date(searchParams.get('startDate') ?? '')
    const end = new Date(searchParams.get('endDate') ?? '')
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new Error('Invalid custom wellbeing range')
    }
    return { kind: 'Custom' as const, start, end }
  }

  const days = raw === '7D' ? 7 : raw === '90D' ? 90 : 30
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  
  return { kind: raw as '7D' | '30D' | '90D', start, end }
}
