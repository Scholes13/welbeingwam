export const MISSING_SCAN_OUT_PENALTY_RATIO = 0.3

type DateLike = Date | string

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value)
}

function toMinutes(deltaMs: number): number {
  return Math.floor(deltaMs / 60000)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function calculateProratedAttendance(input: {
  startAt: DateLike
  endAt: DateLike
  scanInAt: DateLike
  scanOutAt: DateLike
  maxPoints: number
}): {
  scheduledMinutes: number
  attendedMinutes: number
  attendanceRatio: number
  finalPoints: number
} {
  const startAt = toDate(input.startAt)
  const endAt = toDate(input.endAt)
  const scanInAt = toDate(input.scanInAt)
  const scanOutAt = toDate(input.scanOutAt)

  const scheduledMs = Math.max(0, endAt.getTime() - startAt.getTime())
  const scheduledMinutes = toMinutes(scheduledMs)

  if (scheduledMinutes <= 0) {
    return {
      scheduledMinutes: 0,
      attendedMinutes: 0,
      attendanceRatio: 0,
      finalPoints: 0,
    }
  }

  const effectiveInMs = Math.max(scanInAt.getTime(), startAt.getTime())
  const effectiveOutMs = Math.min(scanOutAt.getTime(), endAt.getTime())
  const attendedMs = Math.max(0, effectiveOutMs - effectiveInMs)

  const attendedMinutes = toMinutes(attendedMs)
  const attendanceRatio = clamp(attendedMinutes / scheduledMinutes, 0, 1)
  const finalPoints = Math.floor(Math.max(0, input.maxPoints) * attendanceRatio)

  return {
    scheduledMinutes,
    attendedMinutes,
    attendanceRatio,
    finalPoints,
  }
}

export function calculateMissingScanOutPoints(maxPoints: number): number {
  return Math.floor(Math.max(0, maxPoints) * MISSING_SCAN_OUT_PENALTY_RATIO)
}

export function isPastScanGrace(input: {
  endAt: DateLike
  graceMinutes: number
  now?: DateLike
}): boolean {
  const endAt = toDate(input.endAt)
  const now = toDate(input.now ?? new Date())
  const cutoff = endAt.getTime() + Math.max(0, input.graceMinutes) * 60000

  return now.getTime() > cutoff
}
