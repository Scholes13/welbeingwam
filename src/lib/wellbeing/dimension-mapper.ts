export function resolveDominantDimension(input: {
  quizDimensions: Record<string, number>
  activityDimensions: Record<string, number>
  attendanceDimensions: Record<string, number>
}): { dimension: string; score: number } {
  const combined = new Map<string, number>()

  for (const [dimension, score] of Object.entries(input.quizDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.4)
  }
  for (const [dimension, score] of Object.entries(input.activityDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.35)
  }
  for (const [dimension, score] of Object.entries(input.attendanceDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.25)
  }

  const winner = [...combined.entries()].sort((left, right) => right[1] - left[1])[0]
  return winner ? { dimension: winner[0], score: Math.round(winner[1]) } : { dimension: 'unknown', score: 0 }
}

/**
 * Resolve dominant dimension using actual activity dimension data.
 * Falls back to legacy metric-based resolution if no activity dimensions exist.
 */
export function resolveDominantDimensionFromActivities(
  activityDimensions: Record<string, number>,
  fallback: { quizScore: number; sportScore: number; attendanceScore: number },
): string {
  // If we have actual dimension data from activities, use it
  if (Object.keys(activityDimensions).length > 0) {
    const winner = Object.entries(activityDimensions).sort((a, b) => b[1] - a[1])[0]
    if (winner) return winner[0]
  }

  // Fallback to legacy logic
  return resolveDominantDimension({
    quizDimensions: fallback.quizScore > 0 ? { mental: fallback.quizScore } : {},
    activityDimensions: fallback.sportScore > 0 ? { physical: fallback.sportScore } : {},
    attendanceDimensions: fallback.attendanceScore > 0 ? { social: fallback.attendanceScore } : {},
  }).dimension
}
