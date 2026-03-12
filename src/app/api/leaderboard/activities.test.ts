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
})
