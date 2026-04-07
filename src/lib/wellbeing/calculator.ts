const WEIGHTS = {
  quiz: 0.4,
  sport: 0.25,
  attendance: 0.2,
  other: 0.15,
} as const

export function calculateWellbeingIndex(input: {
  quizScore: number
  sportScore: number
  attendanceScore: number
  otherScore: number
}): number {
  return Math.round(
    input.quizScore * WEIGHTS.quiz +
      input.sportScore * WEIGHTS.sport +
      input.attendanceScore * WEIGHTS.attendance +
      input.otherScore * WEIGHTS.other,
  )
}
