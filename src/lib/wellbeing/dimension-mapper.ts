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
