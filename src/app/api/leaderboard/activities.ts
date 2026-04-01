import type { LeaderboardActivity } from '@/lib/gamification'

type SupabaseSelectResult = {
  data: unknown[] | null
  error: unknown
}

type SupabaseSelectQuery =
  | PromiseLike<SupabaseSelectResult>
  | {
      range: (from: number, to: number) => PromiseLike<SupabaseSelectResult>
    }

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => SupabaseSelectQuery
  }
}

const ACTIVITY_PAGE_SIZE = 1000

export async function fetchLeaderboardActivities(
  supabase: SupabaseLike,
): Promise<LeaderboardActivity[]> {
  const baseQuery = supabase.from('activities').select('*')

  if (!('range' in baseQuery) || typeof baseQuery.range !== 'function') {
    const { data, error } = await (baseQuery as PromiseLike<SupabaseSelectResult>)
    if (error) throw error
    return (data ?? []) as LeaderboardActivity[]
  }

  const activities: LeaderboardActivity[] = []
  const pagedQuery = baseQuery as { range: (from: number, to: number) => PromiseLike<SupabaseSelectResult> }
  let from = 0

  while (true) {
    const { data, error } = await pagedQuery.range(from, from + ACTIVITY_PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const page = (data ?? []) as LeaderboardActivity[]
    activities.push(...page)

    if (page.length < ACTIVITY_PAGE_SIZE) {
      break
    }

    from += ACTIVITY_PAGE_SIZE
  }

  return activities
}
