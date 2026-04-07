import useSWR from 'swr'

import type { WellbeingFilterState, WellbeingOverviewPayload } from '../types'
import { buildWellbeingPath } from '../utils'

async function fetchWellbeingJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : 'Failed to load wellbeing dashboard data'
    throw new Error(message)
  }

  return payload as T
}

export function useWellbeingOverview(filter: WellbeingFilterState) {
  const key = buildWellbeingPath('/api/admin/wellbeing/overview', filter)

  return useSWR<WellbeingOverviewPayload>(key, fetchWellbeingJson, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
    keepPreviousData: true,
  })
}
