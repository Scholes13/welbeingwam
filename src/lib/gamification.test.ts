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
      activities: [{ user_id: 'u1', steps: 105, activity_points: 0, review_status: 'approved', dimension_id: null }],
      userQuests: [{ user_id: 'u1', quest: { points: 5 } }],
      adjustments: [{ user_id: 'u1', points: 2 }],
    })

    expect(leaderboard).toHaveLength(1)
    expect(leaderboard[0]?.total_steps).toBe(105)
    expect(leaderboard[0]?.step_points).toBe(10)
    expect(leaderboard[0]?.sport_points).toBe(0)
    expect(leaderboard[0]?.quest_points).toBe(7)
    expect(leaderboard[0]?.overall_points).toBe(17)
  })

  it('keeps sport calories out of steps and adds them to physical totals', () => {
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
      activities: [
        { user_id: 'u1', steps: 200, activity_points: 0, review_status: 'approved', dimension_id: null },
        { user_id: 'u1', steps: 0, activity_points: 90, review_status: 'approved', dimension_id: 'physical' },
        { user_id: 'u1', steps: 0, activity_points: 40, review_status: 'voided', dimension_id: 'physical' },
      ],
      userQuests: [{ user_id: 'u1', quest: { points: 15, dimension_id: 'physical' } }],
      adjustments: [],
    })

    expect(leaderboard[0]?.total_steps).toBe(200)
    expect(leaderboard[0]?.step_points).toBe(20)
    expect(leaderboard[0]?.sport_points).toBe(90)
    expect(leaderboard[0]?.dimension_points.physical).toBe(125)
    expect(leaderboard[0]?.overall_points).toBe(125)
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
      activities: [{ user_id: 'admin-1', steps: 1000, activity_points: 0, review_status: 'approved', dimension_id: null }],
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
          mode: 'daily',
          calories: 0,
          activity_points: 0,
          review_status: 'approved',
          proof_url: null,
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
          mode: 'daily',
          calories: 0,
          activity_points: 0,
          review_status: 'approved',
          proof_url: null,
        },
        {
          id: 'sport-1',
          user_id: 'u1',
          name: 'Morning Swim',
          distance: 800,
          moving_time: 1800,
          type: 'Swim',
          start_date: '2026-02-12T07:00:00.000Z',
          steps: 0,
          mode: 'sport',
          calories: 250,
          activity_points: 250,
          review_status: 'approved',
          proof_url: 'https://example.com/proof.jpg',
        },
      ],
      attendance: [
        {
          scanned_at: '2026-02-11T08:00:00.000Z',
          activity: { id: 'event-1', title: 'Yoga Class', points: 15 },
        },
      ],
    })

    expect(combined).toHaveLength(3)
    expect(combined[0]?.name).toBe('Morning Swim')
    expect(combined[0]?.activity_points).toBe(250)
    expect(combined[1]?.name).toBe('Yoga Class')
    expect(combined[2]?.name).toBe('Morning Run')
  })

  it('keeps strava sport sessions in history even when calories are missing', () => {
    const combined = buildCombinedActivities({
      userId: 'u1',
      activities: [
        {
          id: 'strava-sport-1',
          user_id: 'u1',
          name: 'Trail Hike',
          distance: 6400,
          moving_time: 4200,
          type: 'Hike',
          start_date: '2026-03-11T10:00:00.000Z',
          steps: 0,
          mode: 'sport',
          calories: 0,
          activity_points: 0,
          review_status: 'approved',
          proof_url: null,
          source: 'strava',
          dimension_id: 'physical',
        },
      ],
      attendance: [],
    })

    expect(combined).toHaveLength(1)
    expect(combined[0]?.mode).toBe('sport')
    expect(combined[0]?.source).toBe('strava')
    expect(combined[0]?.activity_points).toBe(0)
  })
})
