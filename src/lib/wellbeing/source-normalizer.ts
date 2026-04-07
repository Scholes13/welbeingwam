function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizeCoverageScore(ratio: number): number {
  return clampPercentage(ratio * 100)
}

export function normalizeCountScore(input: { count: number; target: number }): number {
  if (input.target <= 0) return 0
  return clampPercentage((input.count / input.target) * 100)
}
