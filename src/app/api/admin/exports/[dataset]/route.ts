import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAuthProfileContext } from '@/utils/auth'
import {
    computeLeaderboardEntries,
    type LeaderboardAdjustment,
    type LeaderboardProfile,
    type LeaderboardQuestRow,
} from '@/lib/gamification'
import { fetchLeaderboardActivities } from '@/app/api/leaderboard/activities'

// ---------------------------------------------------------------------------
// GET /api/admin/exports/[dataset]
//
// Streams a CSV download for one of the supported datasets. Access is gated
// by `profiles.is_admin = true`. The route uses the service role internally
// so RLS does not block aggregate queries.
//
// Datasets:
//   - leaderboard         : aggregated points per user (matches /api/leaderboard)
//   - users               : profiles overview (display + admin flags)
//   - activities          : every activity row (full audit)
//   - point-adjustments   : admin-assigned bonus / penalty points
//   - coin-transactions   : coin balance changes
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type Dataset =
    | 'leaderboard'
    | 'users'
    | 'activities'
    | 'point-adjustments'
    | 'coin-transactions'

const DATASETS: ReadonlySet<Dataset> = new Set([
    'leaderboard',
    'users',
    'activities',
    'point-adjustments',
    'coin-transactions',
])

function isDataset(value: string): value is Dataset {
    return DATASETS.has(value as Dataset)
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = typeof value === 'string' ? value : String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
    const header = columns.map(escapeCsv).join(',')
    if (rows.length === 0) return header + '\n'
    const body = rows
        .map((row) => columns.map((col) => escapeCsv(row[col])).join(','))
        .join('\n')
    return `${header}\n${body}\n`
}

function csvResponse(filename: string, csv: string) {
    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
        },
    })
}

function timestampSuffix(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
        `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
        `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`
    )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ dataset: string }> },
) {
    try {
        const { dataset } = await context.params

        if (!isDataset(dataset)) {
            return NextResponse.json({ error: 'Unknown dataset' }, { status: 400 })
        }

        const auth = await getAuthProfileContext()
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createSupabaseAdminClient()

        const { data: me, error: meErr } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', auth.profileId)
            .maybeSingle()

        if (meErr) {
            console.error('Export auth lookup failed:', meErr)
            return NextResponse.json({ error: 'Failed to verify admin' }, { status: 500 })
        }

        if (!me?.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const stamp = timestampSuffix()

        if (dataset === 'leaderboard') {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, instagram_username, username')

            const activities = await fetchLeaderboardActivities(supabase)

            const { data: userQuests } = await supabase
                .from('user_quests')
                .select('user_id, quest:quests(points, dimension_id)')
                .eq('status', 'approved')

            const { data: adjustments } = await supabase
                .from('point_adjustments')
                .select('user_id, points, dimension_id')

            const leaderboard = computeLeaderboardEntries({
                profiles: (profiles ?? []) as LeaderboardProfile[],
                activities,
                userQuests: (userQuests ?? []) as LeaderboardQuestRow[],
                adjustments: (adjustments ?? []) as LeaderboardAdjustment[],
            }).sort((a, b) => b.overall_points - a.overall_points)

            const usernameById = new Map(
                ((profiles ?? []) as LeaderboardProfile[]).map((p) => [p.id, p.username ?? '']),
            )

            const rows = leaderboard.map((entry, idx) => ({
                rank: idx + 1,
                user_id: entry.user_id,
                username: usernameById.get(entry.user_id) ?? '',
                full_name: entry.full_name ?? '',
                instagram_username: entry.instagram_username ?? '',
                step_points: entry.step_points,
                sport_points: entry.sport_points,
                quest_points: entry.quest_points,
                overall_points: entry.overall_points,
                physical_points: entry.dimension_points?.physical ?? 0,
                emotional_points: entry.dimension_points?.emotional ?? 0,
                social_points: entry.dimension_points?.social ?? 0,
                financial_points: entry.dimension_points?.financial ?? 0,
                spiritual_points: entry.dimension_points?.spiritual ?? 0,
            }))

            const csv = toCsv(rows, [
                'rank', 'user_id', 'username', 'full_name', 'instagram_username',
                'step_points', 'sport_points', 'quest_points', 'overall_points',
                'physical_points', 'emotional_points', 'social_points',
                'financial_points', 'spiritual_points',
            ])

            return csvResponse(`leaderboard-${stamp}.csv`, csv)
        }

        if (dataset === 'users') {
            const { data, error } = await supabase
                .from('profiles')
                .select(
                    'id, username, full_name, instagram_username, gender, is_admin, is_manual, avatar_source, created_at, updated_at, last_strava_sync_at',
                )
                .order('created_at', { ascending: false })

            if (error) throw error

            const csv = toCsv((data ?? []) as Record<string, unknown>[], [
                'id', 'username', 'full_name', 'instagram_username', 'gender',
                'is_admin', 'is_manual', 'avatar_source',
                'created_at', 'updated_at', 'last_strava_sync_at',
            ])

            return csvResponse(`users-${stamp}.csv`, csv)
        }

        if (dataset === 'activities') {
            const { data, error } = await supabase
                .from('activities')
                .select(
                    'id, user_id, name, type, mode, dimension_id, steps, distance, calories, moving_time, activity_points, source, review_status, review_reason, start_date, created_at',
                )
                .order('created_at', { ascending: false })
                .limit(50000)

            if (error) throw error

            const csv = toCsv((data ?? []) as Record<string, unknown>[], [
                'id', 'user_id', 'name', 'type', 'mode', 'dimension_id',
                'steps', 'distance', 'calories', 'moving_time', 'activity_points',
                'source', 'review_status', 'review_reason',
                'start_date', 'created_at',
            ])

            return csvResponse(`activities-${stamp}.csv`, csv)
        }

        if (dataset === 'point-adjustments') {
            const { data, error } = await supabase
                .from('point_adjustments')
                .select('id, user_id, points, dimension_id, reason, created_at')
                .order('created_at', { ascending: false })
                .limit(50000)

            if (error) throw error

            const csv = toCsv((data ?? []) as Record<string, unknown>[], [
                'id', 'user_id', 'points', 'dimension_id', 'reason', 'created_at',
            ])

            return csvResponse(`point-adjustments-${stamp}.csv`, csv)
        }

        if (dataset === 'coin-transactions') {
            const { data, error } = await supabase
                .from('coin_transactions')
                .select('id, user_id, amount, reason, admin_id, created_at')
                .order('created_at', { ascending: false })
                .limit(50000)

            if (error) throw error

            const csv = toCsv((data ?? []) as Record<string, unknown>[], [
                'id', 'user_id', 'amount', 'reason', 'admin_id', 'created_at',
            ])

            return csvResponse(`coin-transactions-${stamp}.csv`, csv)
        }

        return NextResponse.json({ error: 'Unknown dataset' }, { status: 400 })
    } catch (error) {
        console.error('Export route error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
