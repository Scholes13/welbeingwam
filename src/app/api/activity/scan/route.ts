import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  MISSING_SCAN_OUT_PENALTY_RATIO,
  calculateMissingScanOutPoints,
  calculateProratedAttendance,
  isPastScanGrace,
} from '@/lib/activity-attendance'
import { verifyActivityScanToken } from '@/lib/activity-scan-token'
import { NextResponse } from 'next/server'

const COMPLETED_STATES = new Set(['completed', 'completed_penalty'])

type ActivityRow = {
  id: string
  title: string
  points: number | null
  start_at: string
  end_at: string
  is_published: boolean
  scan_grace_minutes: number | null
}

type AttendanceRow = {
  id: string
  activity_id: string
  user_id: number
  scanned_at: string | null
  scan_in_at: string | null
  scan_out_at: string | null
  state: string | null
  points_awarded_at: string | null
}

type OverdueAttendanceRow = AttendanceRow & {
  activity: ActivityRow | ActivityRow[] | null
}

function normalizeActivity(value: ActivityRow | ActivityRow[] | null): ActivityRow | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getTokenSecret(): string | null {
  return process.env.ACTIVITY_QR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

function getGraceMinutes(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 30
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.startsWith('ACT:') ? value.slice(4) : value
}

async function logScan(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  activityId: string
  userId: number
  scanType: 'in' | 'out' | 'invalid'
  result: 'success' | 'error'
  reason?: string
}) {
  await input.supabase.from('activity_scan_logs').insert({
    activity_id: input.activityId,
    user_id: input.userId,
    scan_type: input.scanType,
    result: input.result,
    reason: input.reason || null,
  })
}

async function awardPointsIfNeeded(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  attendanceId: string
  userId: number
  points: number
  activityTitle: string
}) {
  const nowIso = new Date().toISOString()

  const { data: attendance, error: readError } = await input.supabase
    .from('attendance')
    .select('points_awarded_at')
    .eq('id', input.attendanceId)
    .single()

  if (readError) throw readError
  if (attendance?.points_awarded_at) return

  if (input.points > 0) {
    await input.supabase.from('point_adjustments').insert({
      user_id: input.userId,
      points: input.points,
      reason: `Activity Attendance [${input.attendanceId}]: ${input.activityTitle}`,
    })

    await input.supabase.from('notifications').insert({
      user_id: input.userId,
      title: 'Activity Points Awarded',
      message: `You earned ${input.points} points for ${input.activityTitle}.`,
      is_read: false,
    })
  }

  await input.supabase
    .from('attendance')
    .update({ points_awarded_at: nowIso, updated_at: nowIso })
    .eq('id', input.attendanceId)
}

async function applyMissingScanOutPenalty(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  attendance: AttendanceRow
  activity: ActivityRow
  now: Date
}) {
  const nowIso = input.now.toISOString()
  const maxPoints = Number(input.activity.points) || 0
  const finalPoints = calculateMissingScanOutPoints(maxPoints)
  const graceMinutes = getGraceMinutes(input.activity.scan_grace_minutes)

  const { error: updateError } = await input.supabase
    .from('attendance')
    .update({
      scan_out_at: input.activity.end_at,
      attended_minutes: 0,
      attendance_ratio: MISSING_SCAN_OUT_PENALTY_RATIO,
      final_points: finalPoints,
      state: 'completed_penalty',
      is_penalized: true,
      penalty_type: 'missing_scan_out',
      penalty_percent: 30,
      updated_at: nowIso,
    })
    .eq('id', input.attendance.id)

  if (updateError) throw updateError

  await awardPointsIfNeeded({
    supabase: input.supabase,
    attendanceId: input.attendance.id,
    userId: input.attendance.user_id,
    points: finalPoints,
    activityTitle: `${input.activity.title} (penalty 30%)`,
  })

  await logScan({
    supabase: input.supabase,
    activityId: input.activity.id,
    userId: input.attendance.user_id,
    scanType: 'out',
    result: 'success',
    reason: `Auto penalty applied after ${graceMinutes} minutes grace`,
  })

  return {
    finalPoints,
    penaltyPercent: 30,
  }
}

async function finalizeOverdueAttendancesForUser(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  userId: number
  now: Date
}) {
  const { data, error } = await input.supabase
    .from('attendance')
    .select(`
      id,
      activity_id,
      user_id,
      scanned_at,
      scan_in_at,
      scan_out_at,
      state,
      points_awarded_at,
      activity:admin_activities(id, title, points, start_at, end_at, is_published, scan_grace_minutes)
    `)
    .eq('user_id', input.userId)
    .eq('state', 'in_progress')

  if (error || !data) return

  for (const row of data as unknown as OverdueAttendanceRow[]) {
    const activity = normalizeActivity(row.activity)
    if (!activity || row.scan_out_at) continue

    const shouldPenalize = isPastScanGrace({
      endAt: activity.end_at,
      graceMinutes: getGraceMinutes(activity.scan_grace_minutes),
      now: input.now,
    })

    if (!shouldPenalize) continue

    await applyMissingScanOutPenalty({
      supabase: input.supabase,
      attendance: row as AttendanceRow,
      activity: activity as ActivityRow,
      now: input.now,
    })
  }
}

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const token = normalizeToken(body.token ?? body.code)

    if (!token) {
      return NextResponse.json({ error: 'Scan token is required' }, { status: 400 })
    }

    const secret = getTokenSecret()
    if (!secret) {
      return NextResponse.json({ error: 'Activity QR secret is not configured' }, { status: 500 })
    }

    const payload = verifyActivityScanToken({ token, secret })
    const userId = context.profileId
    const supabase = createSupabaseAdminClient()
    const now = new Date()

    await finalizeOverdueAttendancesForUser({ supabase, userId, now })

    const { data: activity, error: activityError } = await supabase
      .from('admin_activities')
      .select('id, title, points, start_at, end_at, is_published, scan_grace_minutes')
      .eq('id', payload.activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!activity.is_published) {
      await logScan({
        supabase,
        activityId: activity.id,
        userId,
        scanType: 'invalid',
        result: 'error',
        reason: 'Activity is unpublished',
      })
      return NextResponse.json({ error: 'Activity is not published' }, { status: 400 })
    }

    const graceMinutes = getGraceMinutes(activity.scan_grace_minutes)
    const activityEnded = isPastScanGrace({ endAt: activity.end_at, graceMinutes, now })

    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, activity_id, user_id, scanned_at, scan_in_at, scan_out_at, state, points_awarded_at')
      .eq('activity_id', activity.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError

    if (!attendance) {
      if (activityEnded) {
        await logScan({
          supabase,
          activityId: activity.id,
          userId,
          scanType: 'invalid',
          result: 'error',
          reason: 'Scan-in after event closed',
        })
        return NextResponse.json({ error: 'Event scan window has closed' }, { status: 400 })
      }

      const nowIso = now.toISOString()
      const { data: inserted, error: insertError } = await supabase
        .from('attendance')
        .insert({
          activity_id: activity.id,
          user_id: userId,
          scanned_at: nowIso,
          scan_in_at: nowIso,
          state: 'in_progress',
          updated_at: nowIso,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      await logScan({
        supabase,
        activityId: activity.id,
        userId,
        scanType: 'in',
        result: 'success',
      })

      return NextResponse.json({
        success: true,
        action: 'scan_in',
        attendanceId: inserted.id,
        nextAction: 'scan_out',
        message: 'Data tersimpan. Scan In berhasil.',
        activity: {
          id: activity.id,
          title: activity.title,
        },
      })
    }

    const currentState = attendance.state || (attendance.scan_out_at ? 'completed' : 'in_progress')
    if (COMPLETED_STATES.has(currentState)) {
      await logScan({
        supabase,
        activityId: activity.id,
        userId,
        scanType: 'invalid',
        result: 'error',
        reason: 'Attendance already completed',
      })

      return NextResponse.json({
        success: false,
        action: 'already_completed',
        message: 'Attendance already completed for this activity.',
      })
    }

    if (!attendance.scan_in_at) {
      const nowIso = now.toISOString()
      await supabase
        .from('attendance')
        .update({ scan_in_at: nowIso, scanned_at: nowIso, state: 'in_progress', updated_at: nowIso })
        .eq('id', attendance.id)

      await logScan({
        supabase,
        activityId: activity.id,
        userId,
        scanType: 'in',
        result: 'success',
        reason: 'Recovered missing scan_in_at',
      })

      return NextResponse.json({
        success: true,
        action: 'scan_in',
        nextAction: 'scan_out',
        message: 'Data tersimpan. Scan In berhasil.',
      })
    }

    if (activityEnded) {
      const penalty = await applyMissingScanOutPenalty({
        supabase,
        attendance: attendance as AttendanceRow,
        activity: activity as ActivityRow,
        now,
      })

      return NextResponse.json({
        success: true,
        action: 'completed_penalty',
        finalPoints: penalty.finalPoints,
        penaltyPercent: penalty.penaltyPercent,
        message: 'Data tersimpan. Scan Out terlambat, penalty 30% diterapkan.',
      })
    }

    const score = calculateProratedAttendance({
      startAt: activity.start_at,
      endAt: activity.end_at,
      scanInAt: attendance.scan_in_at,
      scanOutAt: now,
      maxPoints: Number(activity.points) || 0,
    })

    const nowIso = now.toISOString()
    const { error: updateError } = await supabase
      .from('attendance')
      .update({
        scan_out_at: nowIso,
        attended_minutes: score.attendedMinutes,
        attendance_ratio: score.attendanceRatio,
        final_points: score.finalPoints,
        state: 'completed',
        is_penalized: false,
        penalty_type: null,
        penalty_percent: null,
        updated_at: nowIso,
      })
      .eq('id', attendance.id)

    if (updateError) throw updateError

    await awardPointsIfNeeded({
      supabase,
      attendanceId: attendance.id,
      userId,
      points: score.finalPoints,
      activityTitle: activity.title,
    })

    await logScan({
      supabase,
      activityId: activity.id,
      userId,
      scanType: 'out',
      result: 'success',
    })

    return NextResponse.json({
      success: true,
      action: 'scan_out',
      nextAction: 'completed',
      finalPoints: score.finalPoints,
      attendanceRatio: score.attendanceRatio,
      attendedMinutes: score.attendedMinutes,
      message: `Data tersimpan. Poin final: ${score.finalPoints}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed'
    if (message === 'Token expired') {
      return NextResponse.json({ error: 'QR expired, please rescan.' }, { status: 400 })
    }

    if (message.startsWith('Invalid token')) {
      return NextResponse.json({ error: 'Invalid activity QR token' }, { status: 400 })
    }

    console.error('Activity scan error:', error)
    return NextResponse.json({ error: 'Failed to process activity scan' }, { status: 500 })
  }
}
