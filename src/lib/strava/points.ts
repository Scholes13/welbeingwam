import { calculateAvailableCoins, calculateTotalEarnedPoints, convertStepsToPoints, sumNumericField } from '@/lib/points'
import { sumApprovedQuestPoints, type Quest, type UserQuest } from '@/lib/gamification'

type ActivityForPoints = {
  steps: number
  activity_points: number
  review_status: string
}

type AdjustmentRow = {
  points: number | null
  dimension_id?: string | null
}

export function calculateSyncPoints(input: {
  activities: ActivityForPoints[]
  quests: Quest[]
  userQuests: UserQuest[]
  adjustments: AdjustmentRow[] | null | undefined
  physicalDimensionId: string | null
  totalSpent: number
  coinTransactionTotal: number
}) {
  const totalSteps = sumNumericField(input.activities, (activity) => activity.steps)
  const totalActivityPoints = sumNumericField(
    input.activities.filter((activity) => activity.review_status !== 'voided' && activity.review_status !== 'rejected'),
    (activity) => activity.activity_points
  )
  const stepPoints = convertStepsToPoints(totalSteps)
  const totalQuestPoints = sumApprovedQuestPoints(input.userQuests, input.quests)
  const totalAdjustments = sumNumericField(input.adjustments as { points: number | null }[] | null | undefined, (row) => row.points)
  const approvedQuestIds = new Set(input.userQuests.filter((userQuest) => userQuest.status === 'approved').map((userQuest) => userQuest.quest_id))
  const physicalQuestPoints = sumNumericField(
    input.quests.filter((quest) => approvedQuestIds.has(quest.id) && quest.dimension?.name === 'physical'),
    (quest) => quest.points
  )
  const physicalAdjustmentPoints = sumNumericField(
    (input.adjustments as AdjustmentRow[] | null | undefined)?.filter(
      (row) => row.dimension_id && row.dimension_id === input.physicalDimensionId
    ),
    (row) => row.points
  )

  const totalPoints = calculateTotalEarnedPoints({
    totalSteps,
    totalActivityPoints,
    questPoints: totalQuestPoints,
    adjustmentPoints: totalAdjustments,
  })

  const availableCoins = calculateAvailableCoins({ totalEarned: totalPoints, totalSpent: input.totalSpent }) + input.coinTransactionTotal

  return {
    totalPoints,
    stepPoints,
    sportPoints: totalActivityPoints,
    totalPhysicalPoints: stepPoints + totalActivityPoints + physicalQuestPoints + physicalAdjustmentPoints,
    coins: availableCoins,
  }
}
