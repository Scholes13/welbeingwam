import { convertStepsToPoints, sumNumericField, toSafeNumber } from './points'

export type LeaderboardProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  instagram_username: string | null
  username: string | null
}

export type LeaderboardActivity = {
  user_id: string
  steps: number | null
}

type QuestPayload =
  | { points?: number | null; dimension_id?: string | null }
  | { points?: number | null; dimension_id?: string | null }[]
  | null

export type LeaderboardQuestRow = {
  user_id: string
  quest: QuestPayload
}

export type LeaderboardAdjustment = {
  user_id: string
  points: number | null
  dimension_id?: string | null
}

export type LeaderboardEntry = {
  user_id: string
  full_name: string
  avatar_url: string | null
  instagram_username: string | null
  total_steps: number
  quest_points: number
  overall_points: number
  dimension_points: Record<string, number>
}

type LeaderboardStatsMap = Record<string, LeaderboardEntry>

const EXCLUDED_USERNAMES = new Set(['admin_wam'])
const EXCLUDED_FULL_NAMES = new Set(['Super Admin', 'pramuji arif'])

function extractQuestPoints(payload: QuestPayload): number {
  if (!payload) return 0

  if (Array.isArray(payload)) {
    return sumNumericField(payload, (item) => item.points)
  }

  return toSafeNumber(payload.points)
}

function extractQuestDimensionId(payload: QuestPayload): string | null {
  if (!payload) return null
  if (Array.isArray(payload)) return payload[0]?.dimension_id ?? null
  return payload.dimension_id ?? null
}

export function computeLeaderboardEntries(input: {
  profiles: LeaderboardProfile[]
  activities: LeaderboardActivity[]
  userQuests: LeaderboardQuestRow[]
  adjustments: LeaderboardAdjustment[]
}): LeaderboardEntry[] {
  const stats: LeaderboardStatsMap = {}

  input.profiles.forEach((profile) => {
    const excludedByUsername = profile.username ? EXCLUDED_USERNAMES.has(profile.username) : false
    const excludedByName = profile.full_name ? EXCLUDED_FULL_NAMES.has(profile.full_name) : false
    if (excludedByUsername || excludedByName) return

    stats[profile.id] = {
      user_id: profile.id,
      full_name: profile.full_name ?? 'N/A',
      avatar_url: profile.avatar_url,
      instagram_username: profile.instagram_username,
      total_steps: 0,
      quest_points: 0,
      overall_points: 0,
      dimension_points: {},
    }
  })

  input.activities.forEach((activity) => {
    const entry = stats[activity.user_id]
    if (!entry) return

    entry.total_steps += toSafeNumber(activity.steps)
  })

  input.userQuests.forEach((row) => {
    const entry = stats[row.user_id]
    if (!entry) return

    const pts = extractQuestPoints(row.quest)
    entry.quest_points += pts

    const dimId = extractQuestDimensionId(row.quest)
    if (dimId) {
      entry.dimension_points[dimId] = (entry.dimension_points[dimId] ?? 0) + pts
    }
  })

  const adjustmentsMap: Record<string, number> = {}
  const dimensionAdjMap: Record<string, Record<string, number>> = {}
  input.adjustments.forEach((adjustment) => {
    const pts = toSafeNumber(adjustment.points)
    adjustmentsMap[adjustment.user_id] =
      (adjustmentsMap[adjustment.user_id] ?? 0) + pts

    if (adjustment.dimension_id) {
      if (!dimensionAdjMap[adjustment.user_id]) dimensionAdjMap[adjustment.user_id] = {}
      dimensionAdjMap[adjustment.user_id][adjustment.dimension_id] =
        (dimensionAdjMap[adjustment.user_id][adjustment.dimension_id] ?? 0) + pts
    }
  })

  Object.values(stats).forEach((entry) => {
    entry.quest_points += adjustmentsMap[entry.user_id] ?? 0
    entry.overall_points = convertStepsToPoints(entry.total_steps) + entry.quest_points

    const dimAdj = dimensionAdjMap[entry.user_id]
    if (dimAdj) {
      Object.entries(dimAdj).forEach(([dimId, pts]) => {
        entry.dimension_points[dimId] = (entry.dimension_points[dimId] ?? 0) + pts
      })
    }
  })

  return Object.values(stats)
}

export type Quest = { id: string; points: number }
export type UserQuest = { quest_id: string; status: string | null }

export function sumApprovedQuestPoints(userQuests: UserQuest[], quests: Quest[]): number {
  const questPointsById = new Map(quests.map((quest) => [quest.id, quest.points]))
  let total = 0

  userQuests.forEach((userQuest) => {
    if (userQuest.status !== 'approved') return
    total += toSafeNumber(questPointsById.get(userQuest.quest_id))
  })

  return total
}

export type ActivityItem = {
  id: string | number
  user_id: string | number
  name: string
  distance: number
  moving_time: number
  type: string
  start_date: string
  steps: number
}

export type AttendanceItem = {
  scanned_at: string
  activity: {
    id: string
    title: string
    points: number | null
  }
}

export function buildCombinedActivities(input: {
  userId: string | number
  activities: ActivityItem[]
  attendance: AttendanceItem[]
}): ActivityItem[] {
  const attendanceActivities: ActivityItem[] = input.attendance.map((attendance) => ({
    id: `att-${attendance.activity.id}-${new Date(attendance.scanned_at).getTime()}`,
    user_id: input.userId,
    name: attendance.activity.title,
    distance: 0,
    moving_time: 0,
    type: 'Event',
    start_date: attendance.scanned_at,
    steps: toSafeNumber(attendance.activity.points),
  }))

  return [...input.activities, ...attendanceActivities]
    .filter((activity) => !activity.name.startsWith('Manual Adjustment:'))
    .sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime())
}
