type NumericValue = number | string | null | undefined

export function toSafeNumber(value: NumericValue): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function convertStepsToPoints(totalSteps: NumericValue): number {
  const normalizedSteps = Math.max(0, Math.floor(toSafeNumber(totalSteps)))
  return Math.floor(normalizedSteps / 10)
}

export function calculateTotalEarnedPoints(input: {
  totalSteps: NumericValue
  questPoints: NumericValue
  adjustmentPoints: NumericValue
}): number {
  return (
    convertStepsToPoints(input.totalSteps) +
    toSafeNumber(input.questPoints) +
    toSafeNumber(input.adjustmentPoints)
  )
}

export function calculateAvailableCoins(input: {
  totalEarned: NumericValue
  totalSpent: NumericValue
}): number {
  return toSafeNumber(input.totalEarned) - toSafeNumber(input.totalSpent)
}

export function sumNumericField<T>(items: T[] | null | undefined, getter: (item: T) => NumericValue): number {
  if (!items || items.length === 0) return 0

  return items.reduce((sum, item) => sum + toSafeNumber(getter(item)), 0)
}
