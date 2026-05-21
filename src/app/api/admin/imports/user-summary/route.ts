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
// POST /api/admin/imports/user-summary
//
// Two-phase bulk import for points and coins. Mode is OVERRIDE: every row in
// the CSV represents the desired absolute total. The system computes the
// delta against the user's current snapshot and inserts a point_adjustments
// row plus a coin_transactions row for each non-zero delta. CSV is the
// single source of truth — re-running the same CSV produces zero deltas.
//
// Phases:
//   * action="preview" : parse + match + compute deltas, return preview rows
//                         WITHOUT writing.
//   * action="apply"   : same as preview but writes adjustments / coin tx.
//
// Required CSV columns (case-insensitive, any column order):
//   user_id      : preferred match key (numeric profile id)
//   username     : fallback match key
//   total_points : non-negative integer; OVERRIDE target
//   coins        : non-negative integer; OVERRIDE target
//
// Other columns are ignored. Extra fields like full_name are NOT applied.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type PreviewRow = {
    line: number
    user_id: string | null
    username: string
    matched: boolean
    full_name: string | null
    current_points: number
    new_points: number | null
    points_delta: number
    current_coins: number
    new_coins: number | null
    coins_delta: number
    note: string | null
}

type ParseResult =
    | { ok: true; rows: ParsedRow[] }
    | { ok: false; error: string }

type ParsedRow = {
    line: number
    user_id: string | null
    username: string | null
    total_points: number | null
    coins: number | null
}

// ---------------------------------------------------------------------------
// CSV parsing — minimal RFC-4180 reader. Handles quoted fields, escaped
// double quotes, CRLF and LF line endings.
// ---------------------------------------------------------------------------

function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let current: string[] = []
    let cell = ''
    let inQuotes = false
    let i = 0

    while (i < text.length) {
        const ch = text[i]

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"'
                    i += 2
                    continue
                }
                inQuotes = false
                i++
                continue
            }
            cell += ch
            i++
            continue
        }

        if (ch === '"') {
            inQuotes = true
            i++
            continue
        }

        if (ch === ',') {
            current.push(cell)
            cell = ''
            i++
            continue
        }

        if (ch === '\r') {
            if (text[i + 1] === '\n') i++
            current.push(cell)
            rows.push(current)
            current = []
            cell = ''
            i++
            continue
        }

        if (ch === '\n') {
            current.push(cell)
            rows.push(current)
            current = []
            cell = ''
            i++
            continue
        }

        cell += ch
        i++
    }

    if (cell.length > 0 || current.length > 0) {
        current.push(cell)
        rows.push(current)
    }

    // Drop trailing empty row that pure CRLF/LF newline at EOF leaves behind.
    if (rows.length > 0) {
        const last = rows[rows.length - 1]
        if (last.length === 1 && last[0] === '') rows.pop()
    }

    return rows
}

// ---------------------------------------------------------------------------
// Field extraction helpers
// ---------------------------------------------------------------------------

function findColumnIndex(header: string[], names: string[]): number {
    const normalized = header.map((h) => h.trim().toLowerCase())
    for (const name of names) {
        const idx = normalized.indexOf(name)
        if (idx !== -1) return idx
    }
    return -1
}

function parseInteger(value: string | undefined): number | null {
    if (value === undefined) return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const cleaned = trimmed.replace(/[\s,]/g, '')
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return null
    return Math.round(n)
}

function parseCsvRows(text: string): ParseResult {
    const grid = parseCsv(text)
    if (grid.length === 0) return { ok: false, error: 'CSV kosong' }

    const header = grid[0]
    const userIdIdx = findColumnIndex(header, ['user_id', 'userid', 'id'])
    const usernameIdx = findColumnIndex(header, ['username', 'user_name'])
    const pointsIdx = findColumnIndex(header, ['total_points', 'points', 'overall_points'])
    const coinsIdx = findColumnIndex(header, ['coins', 'coin', 'coin_balance'])

    if (pointsIdx === -1 && coinsIdx === -1) {
        return {
            ok: false,
            error: 'Header CSV harus memiliki minimal kolom total_points atau coins',
        }
    }

    if (userIdIdx === -1 && usernameIdx === -1) {
        return {
            ok: false,
            error: 'Header CSV harus memiliki kolom user_id atau username untuk match user',
        }
    }

    const rows: ParsedRow[] = []
    for (let i = 1; i < grid.length; i++) {
        const cells = grid[i]
        if (cells.every((c) => c.trim() === '')) continue

        const rawUserId = userIdIdx === -1 ? '' : (cells[userIdIdx] ?? '').trim()
        const rawUsername = usernameIdx === -1 ? '' : (cells[usernameIdx] ?? '').trim()

        rows.push({
            line: i + 1,
            user_id: rawUserId === '' ? null : rawUserId,
            username: rawUsername === '' ? null : rawUsername,
            total_points: pointsIdx === -1 ? null : parseInteger(cells[pointsIdx]),
            coins: coinsIdx === -1 ? null : parseInteger(cells[coinsIdx]),
        })
    }

    return { ok: true, rows }
}

// ---------------------------------------------------------------------------
// POST handler — preview or apply
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
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
            console.error('Import auth lookup failed:', meErr)
            return NextResponse.json({ error: 'Failed to verify admin' }, { status: 500 })
        }

        if (!me?.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const formData = await request.formData()
        const action = (formData.get('action') as string | null) ?? 'preview'
        const file = formData.get('file')

        if (action !== 'preview' && action !== 'apply') {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
        }

        const text = await file.text()
        const parseResult = parseCsvRows(text)
        if (!parseResult.ok) {
            return NextResponse.json({ error: parseResult.error }, { status: 400 })
        }

        const parsed = parseResult.rows
        if (parsed.length === 0) {
            return NextResponse.json({ error: 'CSV tidak memiliki baris data' }, { status: 400 })
        }

        // -------------------------------------------------------------
        // Build current snapshot for every user (matches /api/leaderboard)
        // -------------------------------------------------------------
        const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, instagram_username, username')

        const profiles = (profileRows ?? []) as LeaderboardProfile[]
        const profileById = new Map(profiles.map((p) => [String(p.id), p]))
        const profileByUsername = new Map(
            profiles
                .filter((p) => p.username)
                .map((p) => [(p.username as string).trim().toLowerCase(), p]),
        )

        const activities = await fetchLeaderboardActivities(supabase)
        const { data: userQuests } = await supabase
            .from('user_quests')
            .select('user_id, quest:quests(points, dimension_id)')
            .eq('status', 'approved')
        const { data: adjustments } = await supabase
            .from('point_adjustments')
            .select('user_id, points, dimension_id')

        const leaderboard = computeLeaderboardEntries({
            profiles,
            activities,
            userQuests: (userQuests ?? []) as LeaderboardQuestRow[],
            adjustments: (adjustments ?? []) as LeaderboardAdjustment[],
        })

        const pointsByUser = new Map<string, number>()
        for (const entry of leaderboard) {
            pointsByUser.set(String(entry.user_id), entry.overall_points)
        }

        const { data: coinRows } = await supabase
            .from('coin_transactions')
            .select('user_id, amount')

        const coinsByUser = new Map<string, number>()
        for (const row of (coinRows ?? []) as { user_id: string; amount: number }[]) {
            const id = String(row.user_id)
            coinsByUser.set(id, (coinsByUser.get(id) ?? 0) + Number(row.amount || 0))
        }
// __APPEND_MORE_HERE__

        // -------------------------------------------------------------
        // Compute preview (no writes)
        // -------------------------------------------------------------
        const previews: PreviewRow[] = parsed.map((row) => {
            let matched: LeaderboardProfile | null = null
            if (row.user_id) matched = profileById.get(row.user_id) ?? null
            if (!matched && row.username) {
                matched = profileByUsername.get(row.username.toLowerCase()) ?? null
            }

            if (!matched) {
                return {
                    line: row.line,
                    user_id: row.user_id,
                    username: row.username ?? '',
                    matched: false,
                    full_name: null,
                    current_points: 0,
                    new_points: row.total_points,
                    points_delta: 0,
                    current_coins: 0,
                    new_coins: row.coins,
                    coins_delta: 0,
                    note: 'User tidak ditemukan',
                }
            }

            const matchedId = String(matched.id)
            const currentPoints = pointsByUser.get(matchedId) ?? 0
            const currentCoins = coinsByUser.get(matchedId) ?? 0
            const targetPoints = row.total_points
            const targetCoins = row.coins
            const pointsDelta = targetPoints === null ? 0 : targetPoints - currentPoints
            const coinsDelta = targetCoins === null ? 0 : targetCoins - currentCoins

            const noteParts: string[] = []
            if (targetPoints !== null && targetPoints < 0) noteParts.push('total_points negatif')
            if (targetCoins !== null && targetCoins < 0) noteParts.push('coins negatif')

            return {
                line: row.line,
                user_id: matchedId,
                username: matched.username ?? row.username ?? '',
                matched: true,
                full_name: matched.full_name ?? null,
                current_points: currentPoints,
                new_points: targetPoints,
                points_delta: pointsDelta,
                current_coins: currentCoins,
                new_coins: targetCoins,
                coins_delta: coinsDelta,
                note: noteParts.length > 0 ? noteParts.join(', ') : null,
            }
        })

        if (action === 'preview') {
            const matchedCount = previews.filter((p) => p.matched).length
            const unmatchedCount = previews.length - matchedCount
            const pointsTouched = previews.filter((p) => p.matched && p.points_delta !== 0).length
            const coinsTouched = previews.filter((p) => p.matched && p.coins_delta !== 0).length

            return NextResponse.json({
                preview: previews,
                summary: {
                    total: previews.length,
                    matched: matchedCount,
                    unmatched: unmatchedCount,
                    points_changes: pointsTouched,
                    coins_changes: coinsTouched,
                },
            })
        }
// __APPLY_HERE__

        // -------------------------------------------------------------
        // Apply phase — insert point_adjustments + coin_transactions
        // -------------------------------------------------------------
        const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)
        const tag = `Bulk import ${stamp}`

        const pointInserts: Array<Record<string, unknown>> = []
        const coinInserts: Array<Record<string, unknown>> = []

        for (const row of previews) {
            if (!row.matched) continue
            if (row.note && row.note.includes('negatif')) continue

            if (row.points_delta !== 0 && row.user_id) {
                pointInserts.push({
                    user_id: row.user_id,
                    points: row.points_delta,
                    reason: tag,
                })
            }

            if (row.coins_delta !== 0 && row.user_id) {
                coinInserts.push({
                    user_id: row.user_id,
                    amount: row.coins_delta,
                    reason: tag,
                    admin_id: auth.profileId,
                })
            }
        }

        let pointsApplied = 0
        let coinsApplied = 0
        const writeErrors: string[] = []

        if (pointInserts.length > 0) {
            const { error } = await supabase.from('point_adjustments').insert(pointInserts)
            if (error) {
                console.error('Bulk point_adjustments insert failed:', error)
                writeErrors.push(`point_adjustments: ${error.message}`)
            } else {
                pointsApplied = pointInserts.length
            }
        }

        if (coinInserts.length > 0) {
            const { error } = await supabase.from('coin_transactions').insert(coinInserts)
            if (error) {
                console.error('Bulk coin_transactions insert failed:', error)
                writeErrors.push(`coin_transactions: ${error.message}`)
            } else {
                coinsApplied = coinInserts.length
            }
        }

        return NextResponse.json({
            ok: writeErrors.length === 0,
            applied_at: new Date().toISOString(),
            tag,
            counts: {
                points_applied: pointsApplied,
                coins_applied: coinsApplied,
                unmatched: previews.filter((p) => !p.matched).length,
            },
            errors: writeErrors,
        })
    } catch (error) {
        console.error('Import route error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
