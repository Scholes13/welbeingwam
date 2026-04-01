import { createClient, type User } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const CANONICAL_DOMAIN = 'werkudara.com'
const LEGACY_DOMAIN = 'wam.local'
const RESET_PASSWORD = process.env.AUTH_CANONICAL_RESET_PASSWORD ?? 'werkudara88'

type ProfileRow = {
  id: number
  username: string | null
  full_name: string | null
  avatar_url: string | null
  auth_user_id: string | null
  password: string | null
}

type OperationPlan = {
  profileId: number
  username: string
  canonicalEmail: string
  canonicalAuthId: string | null
  legacyAuthId: string | null
  authUserIdNeedsUpdate: boolean
  canonicalUserMissing: boolean
  deletionBlocked: boolean
  deletionBlockers: string[]
}

function normalizeUsername(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function getCanonicalEmail(username: string) {
  return `${normalizeUsername(username)}@${CANONICAL_DOMAIN}`
}

function getLegacyEmail(username: string) {
  return `${normalizeUsername(username)}@${LEGACY_DOMAIN}`
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

async function listAllAuthUsers() {
  const users: User[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }

    users.push(...data.users)

    if (page >= data.lastPage || data.users.length === 0) {
      break
    }

    page += 1
  }

  return users
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, auth_user_id, password')
    .order('id', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ProfileRow[]
}

async function countSurveySubmissionRefs(userIds: string[]) {
  if (userIds.length === 0) {
    return 0
  }

  const { count, error } = await supabase
    .from('survey_submissions')
    .select('*', { count: 'exact', head: true })
    .in('user_id', userIds)

  if (error) {
    throw error
  }

  return count ?? 0
}

function buildAuthUserEmailMap(users: User[]) {
  const map = new Map<string, User>()
  for (const user of users) {
    if (user.email) {
      map.set(user.email.toLowerCase(), user)
    }
  }
  return map
}

function buildOperationPlans(profiles: ProfileRow[], authUsersByEmail: Map<string, User>) {
  const plans: OperationPlan[] = []

  for (const profile of profiles) {
    const username = normalizeUsername(profile.username)
    if (!username) {
      continue
    }

    const canonicalEmail = getCanonicalEmail(username)
    const legacyEmail = getLegacyEmail(username)
    const canonicalUser = authUsersByEmail.get(canonicalEmail)
    const legacyUser = authUsersByEmail.get(legacyEmail)

    const deletionBlockers: string[] = []
    if (!canonicalUser) {
      deletionBlockers.push('missing canonical auth user')
    }
    if (profile.auth_user_id !== (canonicalUser?.id ?? null)) {
      deletionBlockers.push('profile auth_user_id not yet canonical')
    }

    plans.push({
      profileId: profile.id,
      username,
      canonicalEmail,
      canonicalAuthId: canonicalUser?.id ?? null,
      legacyAuthId: legacyUser?.id ?? null,
      authUserIdNeedsUpdate: profile.auth_user_id !== (canonicalUser?.id ?? null),
      canonicalUserMissing: !canonicalUser,
      deletionBlocked: deletionBlockers.length > 0,
      deletionBlockers,
    })
  }

  return plans
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  const apply = hasFlag('--apply')
  const applyDelete = hasFlag('--apply-delete')
  const dryRun = !apply

  if (applyDelete && !apply) {
    throw new Error('Use --apply-delete together with --apply.')
  }

  const profiles = await fetchProfiles()
  const authUsers = await listAllAuthUsers()
  const authUsersByEmail = buildAuthUserEmailMap(authUsers)
  const plans = buildOperationPlans(profiles, authUsersByEmail)

  const legacyAuthIds = plans
    .map((plan) => plan.legacyAuthId)
    .filter((value): value is string => Boolean(value))
  const surveySubmissionLegacyRefs = await countSurveySubmissionRefs(legacyAuthIds)

  const summary = {
    totalProfilesConsidered: plans.length,
    canonicalUsersMissing: plans.filter((plan) => plan.canonicalUserMissing).length,
    profileLinksToUpdate: plans.filter((plan) => plan.authUserIdNeedsUpdate && !plan.canonicalUserMissing).length,
    legacyAuthUsersFound: plans.filter((plan) => plan.legacyAuthId).length,
    plaintextProfilePasswords: profiles.filter((profile) => profile.password && profile.password.trim() !== '').length,
    surveySubmissionLegacyRefs,
    mode: dryRun ? 'dry-run' : applyDelete ? 'apply+delete' : 'apply',
  }

  printSection('Summary')
  console.table([summary])

  printSection('Per-user Plan')
  console.table(
    plans.slice(0, 30).map((plan) => ({
      profileId: plan.profileId,
      username: plan.username,
      canonicalEmail: plan.canonicalEmail,
      canonicalAuthId: plan.canonicalAuthId,
      legacyAuthId: plan.legacyAuthId,
      authUserIdNeedsUpdate: plan.authUserIdNeedsUpdate,
      deletionBlocked: plan.deletionBlocked,
      deletionBlockers: plan.deletionBlockers.join('; '),
    })),
  )
  if (plans.length > 30) {
    console.log(`...and ${plans.length - 30} more`)
  }

  if (dryRun) {
    console.log('\nDry run complete. No data was changed.')
    return
  }

  const missingCanonicalPlans = plans.filter((plan) => plan.canonicalUserMissing)
  if (missingCanonicalPlans.length > 0) {
    console.error('Apply aborted because some profiles do not have canonical @werkudara.com auth users.')
    process.exit(1)
  }

  let updatedProfiles = 0
  let updatedCanonicalUsers = 0

  for (const profile of profiles) {
    const username = normalizeUsername(profile.username)
    if (!username) {
      continue
    }

    const canonicalEmail = getCanonicalEmail(username)
    const canonicalUser = authUsersByEmail.get(canonicalEmail)
    if (!canonicalUser) {
      continue
    }

    const desiredFullName = profile.full_name?.trim() || profile.username || username
    const desiredAvatarUrl = profile.avatar_url ?? null
    const currentMetadata = (canonicalUser.user_metadata ?? {}) as Record<string, unknown>
    const nextMetadata: Record<string, unknown> = {
      ...currentMetadata,
      username,
      full_name: desiredFullName,
      avatar_url: desiredAvatarUrl,
    }

    const metadataChanged =
      currentMetadata.username !== nextMetadata.username ||
      currentMetadata.full_name !== nextMetadata.full_name ||
      currentMetadata.avatar_url !== nextMetadata.avatar_url

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(canonicalUser.id, {
      email: canonicalEmail,
      password: RESET_PASSWORD,
      email_confirm: true,
      user_metadata: nextMetadata,
    })

    if (authUpdateError) {
      throw authUpdateError
    }

    updatedCanonicalUsers += 1

    if (profile.auth_user_id !== canonicalUser.id) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ auth_user_id: canonicalUser.id, password: null })
        .eq('id', profile.id)

      if (profileUpdateError) {
        throw profileUpdateError
      }

      updatedProfiles += 1
    } else if (profile.password && profile.password.trim() !== '') {
      const { error: scrubPasswordError } = await supabase
        .from('profiles')
        .update({ password: null })
        .eq('id', profile.id)

      if (scrubPasswordError) {
        throw scrubPasswordError
      }
    } else if (!metadataChanged) {
      // Password reset is still intentional, even when metadata/link were already canonical.
    }
  }

  printSection('Apply Result')
  console.table([
    {
      updatedCanonicalUsers,
      updatedProfiles,
      pendingLegacyDeletes: plans.filter((plan) => plan.legacyAuthId).length,
    },
  ])

  if (!applyDelete) {
    console.log('\nApply complete. Legacy @wam.local users were retained.')
    return
  }

  const refreshedProfiles = await fetchProfiles()
  const refreshedAuthUsers = await listAllAuthUsers()
  const refreshedAuthUsersByEmail = buildAuthUserEmailMap(refreshedAuthUsers)
  const refreshedPlans = buildOperationPlans(refreshedProfiles, refreshedAuthUsersByEmail)
  const refreshedLegacyAuthIds = refreshedPlans
    .map((plan) => plan.legacyAuthId)
    .filter((value): value is string => Boolean(value))
  const refreshedSurveySubmissionLegacyRefs = await countSurveySubmissionRefs(refreshedLegacyAuthIds)

  const deleteBlockers = [...refreshedPlans.filter((plan) => plan.deletionBlocked)]
  if (refreshedSurveySubmissionLegacyRefs > 0) {
    deleteBlockers.push({
      profileId: -1,
      username: 'survey_submissions',
      canonicalEmail: '',
      canonicalAuthId: null,
      legacyAuthId: null,
      authUserIdNeedsUpdate: false,
      canonicalUserMissing: false,
      deletionBlocked: true,
      deletionBlockers: [
        `survey_submissions still references ${refreshedSurveySubmissionLegacyRefs} legacy auth rows`,
      ],
    })
  }

  if (deleteBlockers.length > 0) {
    console.error('Delete aborted because legacy auth rows still have blockers:')
    console.table(
      deleteBlockers.map((blocker) => ({
        profileId: blocker.profileId,
        username: blocker.username,
        blockers: blocker.deletionBlockers.join('; '),
      })),
    )
    process.exit(1)
  }

  let deletedLegacyUsers = 0
  for (const plan of refreshedPlans) {
    if (!plan.legacyAuthId) {
      continue
    }

    const { error } = await supabase.auth.admin.deleteUser(plan.legacyAuthId)
    if (error) {
      throw error
    }

    deletedLegacyUsers += 1
  }

  printSection('Delete Result')
  console.table([
    {
      deletedLegacyUsers,
    },
  ])
}

main().catch((error) => {
  console.error('Canonicalization script failed:', error)
  process.exit(1)
})
