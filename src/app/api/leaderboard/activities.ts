import type { LeaderboardActivity } from '@/lib/gamification'

type SupabaseSelectResult = {
  data: unknown[] | null
  error: unknown
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => PromiseLike<SupabaseSelectResult>
  }
}

export async function fetchLeaderboardActivities(
  supabase: SupabaseLike,
): Promise<LeaderboardActivity[]> {
  const { data, error } = await supabase.from('activities').select('*')

  if (error) {
    throw error
  }

  return (data ?? []) as LeaderboardActivity[]
}
