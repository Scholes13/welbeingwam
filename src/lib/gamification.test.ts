import { describe, expect, it } from 'vitest'

import {
  buildCombinedActivities,
  computeLeaderboardEntries,
  sumApprovedQuestPoints,
} from './gamification'

describe('computeLeaderboardEntries', () => {
  it('converts steps to points and includes adjustments', () => {
    const leaderboard = computeLeaderboardEntries({
      profiles: [
        {
          id: 'u1',
          full_name: 'Alice',
          avatar_url: null,
          instagram_username: null,
          username: 'alice',
        },
      ],
      activities: [{ user_id: 'u1', steps: 105 }],
      userQuests: [{ user_id: 'u1', quest: { points: 5 } }],
      adjustments: [{ user_id: 'u1', points: 2 }],
    })

    expect(leaderboard).toHaveLength(1)
    expect(leaderboard[0]?.total_steps).toBe(105)
    expect(leaderboard[0]?.quest_points).toBe(7)
    expect(leaderboard[0]?.overall_points).toBe(17)
  })

  it('excludes known admin identities', () => {
    const leaderboard = computeLeaderboardEntries({
      profiles: [
        {
          id: 'admin-1',
          full_name: 'Super Admin',
          avatar_url: null,
          instagram_username: null,
          username: 'admin_wam',
        },
      ],
      activities: [{ user_id: 'admin-1', steps: 1000 }],
      userQuests: [{ user_id: 'admin-1', quest: { points: 50 } }],
      adjustments: [{ user_id: 'admin-1', points: 20 }],
    })

    expect(leaderboard).toHaveLength(0)
  })
})

describe('sumApprovedQuestPoints', () => {
  it('sums only approved quests', () => {
    const total = sumApprovedQuestPoints(
      [
        { quest_id: 'q1', status: 'approved' },
        { quest_id: 'q2', status: 'pending' },
      ],
      [
        { id: 'q1', points: 20 },
        { id: 'q2', points: 40 },
      ]
    )

    expect(total).toBe(20)
  })
})

describe('buildCombinedActivities', () => {
  it('adds attendance entries, filters manual adjustments, and sorts newest first', () => {
    const combined = buildCombinedActivities({
      userId: 'u1',
      activities: [
        {
          id: 'strava-1',
          user_id: 'u1',
          name: 'Morning Run',
          distance: 3000,
          moving_time: 1500,
          type: 'Run',
          start_date: '2026-02-10T09:00:00.000Z',
          steps: 3500,
        },
        {
          id: 'manual-1',
          user_id: 'u1',
          name: 'Manual Adjustment: bonus',
          distance: 0,
          moving_time: 0,
          type: 'Manual',
          start_date: '2026-02-10T10:00:00.000Z',
          steps: 100,
        },
      ],
      attendance: [
        {
          scanned_at: '2026-02-11T08:00:00.000Z',
          activity: { id: 'event-1', title: 'Yoga Class', points: 15 },
        },
      ],
    })

    expect(combined).toHaveLength(2)
    expect(combined[0]?.name).toBe('Yoga Class')
    expect(combined[1]?.name).toBe('Morning Run')
  })
})
