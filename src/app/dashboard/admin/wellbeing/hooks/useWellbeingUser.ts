import useSWR from 'swr'

import type { WellbeingFilterState, WellbeingUserDetailPayload } from '../types'
import { buildWellbeingPath } from '../utils'

async function fetchWellbeingJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : 'Failed to load user wellbeing detail'
    throw new Error(message)
  }

  return payload as T
}

export function useWellbeingUser(userId: number | null, filter: WellbeingFilterState) {
  const key = userId
    ? buildWellbeingPath(`/api/admin/wellbeing/users/${userId}`, filter)
    : null

  return useSWR<WellbeingUserDetailPayload>(key, fetchWellbeingJson, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
    keepPreviousData: true,
  })
}
