import { describe, expect, it } from 'vitest'

import { fetchLeaderboardActivities } from './activities'

describe('fetchLeaderboardActivities', () => {
  it('uses wildcard selection so legacy activity schemas do not break leaderboard loading', async () => {
    let selectedColumns = ''

    const result = await fetchLeaderboardActivities({
      from(table: string) {
        expect(table).toBe('activities')

        return {
          async select(columns: string) {
            selectedColumns = columns

            return {
              data: [
                {
                  user_id: 'user-1',
                  steps: 1000,
                },
              ],
              error: null,
            }
          },
        }
      },
    })

    expect(selectedColumns).toBe('*')
    expect(result).toEqual([
      {
        user_id: 'user-1',
        steps: 1000,
      },
    ])
  })

  it('keeps fetching additional pages when activities exceed the default Supabase page size', async () => {
    const ranges: Array<{ from: number; to: number }> = []

    const result = await fetchLeaderboardActivities({
      from(table: string) {
        expect(table).toBe('activities')

        return {
          select(columns: string) {
            expect(columns).toBe('*')

            return {
              range(from: number, to: number) {
                ranges.push({ from, to })

                if (from === 0) {
                  return Promise.resolve({
                    data: Array.from({ length: 1000 }, (_, index) => ({
                      user_id: `user-${index}`,
                      steps: index,
                    })),
                    error: null,
                  })
                }

                return Promise.resolve({
                  data: [
                    {
                      user_id: 'sport-user',
                      steps: 0,
                      activity_points: 649,
                    },
                  ],
                  error: null,
                })
              },
            }
          },
        }
      },
    })

    expect(ranges).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ])
    expect(result).toHaveLength(1001)
    expect(result[1000]).toEqual({
      user_id: 'sport-user',
      steps: 0,
      activity_points: 649,
    })
  })
})
