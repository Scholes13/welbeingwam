import { describe, expect, it } from 'vitest'

import {
  MISSING_SCAN_OUT_PENALTY_RATIO,
  calculateMissingScanOutPoints,
  calculateProratedAttendance,
  isPastScanGrace,
} from './activity-attendance'

describe('calculateProratedAttendance', () => {
  it('returns full points when user attends full activity window', () => {
    const result = calculateProratedAttendance({
      startAt: '2026-02-17T19:00:00.000Z',
      endAt: '2026-02-17T21:00:00.000Z',
      scanInAt: '2026-02-17T18:55:00.000Z',
      scanOutAt: '2026-02-17T21:15:00.000Z',
      maxPoints: 100,
    })

    expect(result.scheduledMinutes).toBe(120)
    expect(result.attendedMinutes).toBe(120)
    expect(result.attendanceRatio).toBe(1)
    expect(result.finalPoints).toBe(100)
  })

  it('reduces points linearly for late check-in and early check-out', () => {
    const result = calculateProratedAttendance({
      startAt: '2026-02-17T19:00:00.000Z',
      endAt: '2026-02-17T21:00:00.000Z',
      scanInAt: '2026-02-17T19:30:00.000Z',
      scanOutAt: '2026-02-17T20:15:00.000Z',
      maxPoints: 100,
    })

    expect(result.scheduledMinutes).toBe(120)
    expect(result.attendedMinutes).toBe(45)
    expect(result.attendanceRatio).toBe(0.375)
    expect(result.finalPoints).toBe(37)
  })

  it('never returns negative durations for invalid scan sequence', () => {
    const result = calculateProratedAttendance({
      startAt: '2026-02-17T19:00:00.000Z',
      endAt: '2026-02-17T21:00:00.000Z',
      scanInAt: '2026-02-17T21:30:00.000Z',
      scanOutAt: '2026-02-17T20:00:00.000Z',
      maxPoints: 100,
    })

    expect(result.attendedMinutes).toBe(0)
    expect(result.finalPoints).toBe(0)
  })
})

describe('calculateMissingScanOutPoints', () => {
  it('applies the default 30% penalty', () => {
    expect(MISSING_SCAN_OUT_PENALTY_RATIO).toBe(0.3)
    expect(calculateMissingScanOutPoints(100)).toBe(30)
    expect(calculateMissingScanOutPoints(95)).toBe(28)
  })
})

describe('isPastScanGrace', () => {
  it('returns false before the grace cutoff', () => {
    const value = isPastScanGrace({
      endAt: '2026-02-17T21:00:00.000Z',
      graceMinutes: 30,
      now: '2026-02-17T21:25:00.000Z',
    })

    expect(value).toBe(false)
  })

  it('returns true once grace cutoff is exceeded', () => {
    const value = isPastScanGrace({
      endAt: '2026-02-17T21:00:00.000Z',
      graceMinutes: 30,
      now: '2026-02-17T21:31:00.000Z',
    })

    expect(value).toBe(true)
  })

  it('returns the same grace-cutoff decision when the same completion is evaluated repeatedly', () => {
    const input = {
      endAt: '2026-02-17T21:00:00.000Z',
      graceMinutes: 30,
      now: '2026-02-17T21:31:00.000Z',
    }

    const first = isPastScanGrace(input)
    const second = isPastScanGrace(input)

    expect(first).toBe(true)
    expect(second).toBe(first)
  })
})

describe('repeat completion boundaries', () => {
  it('calculates the same final points when the same attendance window is finalized twice', () => {
    const input = {
      startAt: '2026-02-17T19:00:00.000Z',
      endAt: '2026-02-17T21:00:00.000Z',
      scanInAt: '2026-02-17T19:05:00.000Z',
      scanOutAt: '2026-02-17T20:50:00.000Z',
      maxPoints: 100,
    }

    const first = calculateProratedAttendance(input)
    const second = calculateProratedAttendance(input)

    expect(first).toEqual(second)
    expect(first.finalPoints).toBe(87)
  })
})
