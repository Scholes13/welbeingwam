import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

type SectionSummary = {
  critical: boolean
  lines: string[]
}

function printSection(name: string, summary: SectionSummary) {
  console.log(`\n[${name}]`)
  if (summary.lines.length === 0) {
    console.log('OK')
    return
  }

  summary.lines.forEach((line) => console.log(line))
}

async function checkIdentityDrift(): Promise<SectionSummary> {
  const lines: string[] = []

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, auth_user_id')

  if (error) {
    return {
      critical: true,
      lines: [`query_failed=${error.message}`],
    }
  }

  const missingAuthMapping = (profiles ?? []).filter((profile) => !profile.auth_user_id)
  if (missingAuthMapping.length > 0) {
    lines.push(`missing_auth_user_id=${missingAuthMapping.length}`)
    missingAuthMapping.slice(0, 10).forEach((profile) => {
      lines.push(`- profile_id=${profile.id} username=${profile.username ?? 'null'}`)
    })
  }

  const duplicateUsernameMap = new Map<string, number>()
  ;(profiles ?? []).forEach((profile) => {
    const username = String(profile.username ?? '').trim().toLowerCase()
    if (!username) return
    duplicateUsernameMap.set(username, (duplicateUsernameMap.get(username) ?? 0) + 1)
  })

  const duplicateUsernames = Array.from(duplicateUsernameMap.entries()).filter(([, count]) => count > 1)
  if (duplicateUsernames.length > 0) {
    lines.push(`duplicate_usernames=${duplicateUsernames.length}`)
    duplicateUsernames.slice(0, 10).forEach(([username, count]) => {
      lines.push(`- username=${username} count=${count}`)
    })
  }

  return {
    critical: lines.length > 0,
    lines,
  }
}

async function checkRewardDrift(): Promise<SectionSummary> {
  const lines: string[] = []

  const [{ data: rewards, error: rewardsError }, { data: claims, error: claimsError }] = await Promise.all([
    supabase.from('rewards').select('id, title, total_claimed, max_claims'),
    supabase.from('user_rewards').select('user_id, reward_id'),
  ])

  if (rewardsError || claimsError) {
    return {
      critical: true,
      lines: [`query_failed=${rewardsError?.message ?? claimsError?.message}`],
    }
  }

  const claimCounts = new Map<string, number>()
  const duplicateClaims = new Map<string, number>()

  ;(claims ?? []).forEach((claim) => {
    claimCounts.set(claim.reward_id, (claimCounts.get(claim.reward_id) ?? 0) + 1)
    const key = `${claim.user_id}:${claim.reward_id}`
    duplicateClaims.set(key, (duplicateClaims.get(key) ?? 0) + 1)
  })

  const duplicateClaimRows = Array.from(duplicateClaims.entries()).filter(([, count]) => count > 1)
  if (duplicateClaimRows.length > 0) {
    lines.push(`duplicate_claim_pairs=${duplicateClaimRows.length}`)
    duplicateClaimRows.slice(0, 10).forEach(([key, count]) => {
      const [userId, rewardId] = key.split(':')
      lines.push(`- user_id=${userId} reward_id=${rewardId} count=${count}`)
    })
  }

  const counterMismatch = (rewards ?? []).filter((reward) => {
    const actual = claimCounts.get(reward.id) ?? 0
    return Number(reward.total_claimed ?? 0) !== actual
  })

  if (counterMismatch.length > 0) {
    lines.push(`reward_counter_mismatches=${counterMismatch.length}`)
    counterMismatch.slice(0, 10).forEach((reward) => {
      const actual = claimCounts.get(reward.id) ?? 0
      lines.push(
        `- reward_id=${reward.id} title=${reward.title} stored=${Number(reward.total_claimed ?? 0)} actual=${actual}`
      )
    })
  }

  const oversoldRewards = (rewards ?? []).filter((reward) => {
    const maxClaims = Number(reward.max_claims ?? 0)
    const actual = claimCounts.get(reward.id) ?? 0
    return maxClaims > 0 && actual > maxClaims
  })

  if (oversoldRewards.length > 0) {
    lines.push(`oversold_rewards=${oversoldRewards.length}`)
    oversoldRewards.slice(0, 10).forEach((reward) => {
      const actual = claimCounts.get(reward.id) ?? 0
      lines.push(`- reward_id=${reward.id} title=${reward.title} max=${reward.max_claims} actual=${actual}`)
    })
  }

  return {
    critical: lines.length > 0,
    lines,
  }
}

async function checkAttendanceDrift(): Promise<SectionSummary> {
  const lines: string[] = []

  const { data: rows, error } = await supabase
    .from('attendance')
    .select('id, user_id, activity_id, state, final_points, points_awarded_at, scan_out_at')

  if (error) {
    return {
      critical: true,
      lines: [`query_failed=${error.message}`],
    }
  }

  const completedWithoutAward = (rows ?? []).filter((row) => {
    const finalPoints = Number(row.final_points ?? 0)
    const state = String(row.state ?? '')
    const completed = state === 'completed' || state === 'completed_penalty' || Boolean(row.scan_out_at)
    return completed && finalPoints > 0 && !row.points_awarded_at
  })

  if (completedWithoutAward.length > 0) {
    lines.push(`completed_without_points_awarded_at=${completedWithoutAward.length}`)
    completedWithoutAward.slice(0, 10).forEach((row) => {
      lines.push(
        `- attendance_id=${row.id} user_id=${row.user_id} activity_id=${row.activity_id} final_points=${row.final_points}`
      )
    })
  }

  return {
    critical: lines.length > 0,
    lines,
  }
}

async function checkSecurityConfig(): Promise<SectionSummary> {
  const lines: string[] = []

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, password, sync_key')

  if (error) {
    return {
      critical: true,
      lines: [`query_failed=${error.message}`],
    }
  }

  const plaintextPasswords = (profiles ?? []).filter((profile) => Boolean(profile.password))
  if (plaintextPasswords.length > 0) {
    lines.push(`profiles_with_plaintext_password=${plaintextPasswords.length}`)
    plaintextPasswords.slice(0, 10).forEach((profile) => {
      lines.push(`- profile_id=${profile.id} username=${profile.username ?? 'null'}`)
    })
  }

  const staticSyncKeys = (profiles ?? []).filter((profile) => Boolean(profile.sync_key))
  if (staticSyncKeys.length > 0) {
    lines.push(`profiles_with_sync_key=${staticSyncKeys.length}`)
    lines.push('- note=sync_key acts as a bearer credential and should be scoped/rotatable')
  }

  if (!process.env.ACTIVITY_QR_SECRET) {
    lines.push('missing_activity_qr_secret=true')
    lines.push('- note=activity QR signing currently falls back to a stronger secret when this is absent')
  }

  return {
    critical: lines.length > 0,
    lines,
  }
}

async function main() {
  const [identity, reward, attendance, security] = await Promise.all([
    checkIdentityDrift(),
    checkRewardDrift(),
    checkAttendanceDrift(),
    checkSecurityConfig(),
  ])

  printSection('identity_drift', identity)
  printSection('reward_drift', reward)
  printSection('attendance_drift', attendance)
  printSection('security_config', security)

  const hasCriticalIssues = [identity, reward, attendance, security].some((section) => section.critical)
  process.exitCode = hasCriticalIssues ? 1 : 0
}

main().catch((error) => {
  console.error('[fatal]')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
