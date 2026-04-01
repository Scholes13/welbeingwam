import { createClient, type User } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'node:fs'
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

type ProfileRow = {
  id: number
  username: string | null
  auth_user_id: string | null
  password: string | null
}

type PublicAuthReferenceCount = {
  table: string
  column: string
  legacyRows: number
  canonicalRows: number
}

type ManagementQueryResult<T> = {
  data: T[] | null
  error: string | null
}

const CANONICAL_DOMAIN = 'werkudara.com'
const LEGACY_DOMAIN = 'wam.local'
const MANAGEMENT_API_URL = 'https://api.supabase.com/v1/projects'
const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260401000000_auth_canonicalization_guards.sql',
)

function normalizeUsername(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function getDomain(email: string | null | undefined) {
  return (email ?? '').split('@')[1]?.trim().toLowerCase() ?? null
}

function getUsernameKeyFromEmail(email: string | null | undefined) {
  const localPart = (email ?? '').split('@')[0]
  return normalizeUsername(localPart)
}

function getCanonicalEmail(username: string) {
  return `${normalizeUsername(username)}@${CANONICAL_DOMAIN}`
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

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

function printTable(rows: unknown[]) {
  if (rows.length === 0) {
    console.log('none')
    return
  }

  console.table(rows)
}

function getManagementToken() {
  return process.env.SUPABASE_MANAGEMENT_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN ?? null
}

function getProjectRef() {
  return new URL(supabaseUrl).hostname.split('.')[0]
}

async function runReadOnlyManagementQuery<T>(query: string): Promise<ManagementQueryResult<T>> {
  const token = getManagementToken()
  if (!token) {
    return {
      data: null,
      error: 'Missing SUPABASE_MANAGEMENT_TOKEN or SUPABASE_ACCESS_TOKEN; skipping live management SQL checks.',
    }
  }

  const response = await fetch(`${MANAGEMENT_API_URL}/${getProjectRef()}/database/query/read-only`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      data: null,
      error: `Management API returned ${response.status}: ${errorText}`,
    }
  }

  const payload = (await response.json()) as T[]
  return {
    data: payload,
    error: null,
  }
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, auth_user_id, password')
    .order('id', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ProfileRow[]
}

async function fetchPublicAuthReferenceCounts(legacyIds: string[], canonicalIds: string[]) {
  const counts: PublicAuthReferenceCount[] = []

  const { count: legacyProfileRows, error: legacyProfileError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('auth_user_id', legacyIds.length > 0 ? legacyIds : ['00000000-0000-0000-0000-000000000000'])

  if (legacyProfileError) {
    throw legacyProfileError
  }

  const { count: canonicalProfileRows, error: canonicalProfileError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('auth_user_id', canonicalIds.length > 0 ? canonicalIds : ['00000000-0000-0000-0000-000000000000'])

  if (canonicalProfileError) {
    throw canonicalProfileError
  }

  counts.push({
    table: 'public.profiles',
    column: 'auth_user_id',
    legacyRows: legacyProfileRows ?? 0,
    canonicalRows: canonicalProfileRows ?? 0,
  })

  const { count: legacySurveyRows, error: legacySurveyError } = await supabase
    .from('survey_submissions')
    .select('*', { count: 'exact', head: true })
    .in('user_id', legacyIds.length > 0 ? legacyIds : ['00000000-0000-0000-0000-000000000000'])

  if (legacySurveyError) {
    throw legacySurveyError
  }

  const { count: canonicalSurveyRows, error: canonicalSurveyError } = await supabase
    .from('survey_submissions')
    .select('*', { count: 'exact', head: true })
    .in('user_id', canonicalIds.length > 0 ? canonicalIds : ['00000000-0000-0000-0000-000000000000'])

  if (canonicalSurveyError) {
    throw canonicalSurveyError
  }

  counts.push({
    table: 'public.survey_submissions',
    column: 'user_id',
    legacyRows: legacySurveyRows ?? 0,
    canonicalRows: canonicalSurveyRows ?? 0,
  })

  return counts
}

async function fetchLiveIndexPresence() {
  const query = `
    select schemaname, indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in ('profiles_auth_user_id_unique', 'profiles_username_canonical_unique')
    order by indexname;
  `

  return runReadOnlyManagementQuery<{ schemaname: string; indexname: string }>(query)
}

async function main() {
  const profiles = await fetchProfiles()
  const authUsers = await listAllAuthUsers()
  const relevantAuthUsers = authUsers.filter((user) => {
    const domain = getDomain(user.email)
    return domain === CANONICAL_DOMAIN || domain === LEGACY_DOMAIN
  })

  const authUsersByEmail = new Map<string, User>()
  const authUsersByUsername = new Map<
    string,
    {
      canonical: User[]
      legacy: User[]
      other: User[]
    }
  >()

  for (const user of relevantAuthUsers) {
    if (user.email) {
      authUsersByEmail.set(user.email.toLowerCase(), user)
    }

    const usernameKey = getUsernameKeyFromEmail(user.email)
    const bucket = authUsersByUsername.get(usernameKey) ?? {
      canonical: [],
      legacy: [],
      other: [],
    }
    const domain = getDomain(user.email)

    if (domain === CANONICAL_DOMAIN) {
      bucket.canonical.push(user)
    } else if (domain === LEGACY_DOMAIN) {
      bucket.legacy.push(user)
    } else {
      bucket.other.push(user)
    }

    authUsersByUsername.set(usernameKey, bucket)
  }

  const missingAuthUserId = profiles
    .filter((profile) => !profile.auth_user_id)
    .map((profile) => ({
      profileId: profile.id,
      username: profile.username,
      expectedEmail: profile.username ? getCanonicalEmail(profile.username) : null,
    }))

  const profileUsernameDuplicates = Array.from(
    profiles.reduce((map, profile) => {
      const key = normalizeUsername(profile.username)
      if (!key) return map
      map.set(key, (map.get(key) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
  )
    .filter(([, count]) => count > 1)
    .map(([usernameKey, count]) => ({ usernameKey, count }))

  const canonicalIssues = profiles.flatMap((profile) => {
    const usernameKey = normalizeUsername(profile.username)
    if (!usernameKey) {
      return [
        {
          profileId: profile.id,
          username: profile.username,
          issue: 'missing_username',
          expectedCanonicalEmail: null,
          linkedAuthUserId: profile.auth_user_id,
        },
      ]
    }

    const expectedCanonicalEmail = getCanonicalEmail(usernameKey)
    const canonicalUser = authUsersByEmail.get(expectedCanonicalEmail)
    const issues: Array<Record<string, unknown>> = []

    if (!canonicalUser) {
      issues.push({
        profileId: profile.id,
        username: profile.username,
        issue: 'missing_canonical_auth_user',
        expectedCanonicalEmail,
        linkedAuthUserId: profile.auth_user_id,
      })
      return issues
    }

    if (profile.auth_user_id !== canonicalUser.id) {
      issues.push({
        profileId: profile.id,
        username: profile.username,
        issue: profile.auth_user_id ? 'auth_user_id_not_canonical' : 'auth_user_id_missing',
        expectedCanonicalEmail,
        expectedCanonicalAuthUserId: canonicalUser.id,
        linkedAuthUserId: profile.auth_user_id,
      })
    }

    return issues
  })

  const duplicateAuthIdentities = Array.from(authUsersByUsername.entries())
    .filter(([, bucket]) => bucket.canonical.length + bucket.legacy.length + bucket.other.length > 1)
    .map(([usernameKey, bucket]) => ({
      usernameKey,
      canonicalEmails: bucket.canonical.map((user) => user.email),
      legacyEmails: bucket.legacy.map((user) => user.email),
      total: bucket.canonical.length + bucket.legacy.length + bucket.other.length,
    }))

  const legacyAuthIds = relevantAuthUsers
    .filter((user) => getDomain(user.email) === LEGACY_DOMAIN)
    .map((user) => user.id)
  const canonicalAuthIds = relevantAuthUsers
    .filter((user) => getDomain(user.email) === CANONICAL_DOMAIN)
    .map((user) => user.id)

  const publicAuthReferenceCounts = await fetchPublicAuthReferenceCounts(legacyAuthIds, canonicalAuthIds)
  const liveIndexPresence = await fetchLiveIndexPresence()
  const localMigrationExists = fs.existsSync(MIGRATION_PATH)
  const legacyPlaintextPasswords = profiles
    .filter((profile) => profile.password && profile.password.trim() !== '')
    .map((profile) => ({
      profileId: profile.id,
      username: profile.username,
    }))

  const expectedIndexNames = new Set([
    'profiles_auth_user_id_unique',
    'profiles_username_canonical_unique',
  ])
  const liveIndexNames = new Set(liveIndexPresence.data?.map((row) => row.indexname) ?? [])
  const liveMissingIndexes = Array.from(expectedIndexNames).filter((indexName) => !liveIndexNames.has(indexName))
  const liveIndexVerificationBlocked = Boolean(liveIndexPresence.error)

  const hasBlockingIssues =
    missingAuthUserId.length > 0 ||
    profileUsernameDuplicates.length > 0 ||
    canonicalIssues.length > 0 ||
    legacyPlaintextPasswords.length > 0 ||
    duplicateAuthIdentities.length > 0 ||
    publicAuthReferenceCounts.some((row) => row.table === 'public.survey_submissions' && row.legacyRows > 0) ||
    liveIndexVerificationBlocked ||
    liveMissingIndexes.length > 0

  printSection('Summary')
  console.table([
    {
      totalProfiles: profiles.length,
      totalRelevantAuthUsers: relevantAuthUsers.length,
      missingAuthUserId: missingAuthUserId.length,
      canonicalIssues: canonicalIssues.length,
      duplicateAuthIdentities: duplicateAuthIdentities.length,
      duplicateProfileUsernames: profileUsernameDuplicates.length,
      legacyPlaintextPasswords: legacyPlaintextPasswords.length,
      localMigrationExists,
    },
  ])

  printSection('Profiles Missing auth_user_id')
  printTable(missingAuthUserId.slice(0, 20))
  if (missingAuthUserId.length > 20) {
    console.log(`...and ${missingAuthUserId.length - 20} more`)
  }

  printSection('Canonical Link Issues')
  printTable(canonicalIssues.slice(0, 20))
  if (canonicalIssues.length > 20) {
    console.log(`...and ${canonicalIssues.length - 20} more`)
  }

  printSection('Duplicate Auth Identities')
  printTable(duplicateAuthIdentities.slice(0, 20))
  if (duplicateAuthIdentities.length > 20) {
    console.log(`...and ${duplicateAuthIdentities.length - 20} more`)
  }

  printSection('Duplicate Profile Usernames')
  printTable(profileUsernameDuplicates)

  printSection('Public auth.users Reference Counts')
  printTable(publicAuthReferenceCounts)

  printSection('Legacy Plaintext Profile Passwords')
  printTable(legacyPlaintextPasswords.slice(0, 20))
  if (legacyPlaintextPasswords.length > 20) {
    console.log(`...and ${legacyPlaintextPasswords.length - 20} more`)
  }

  printSection('Schema Guards')
  if (liveIndexPresence.error) {
    console.log(liveIndexPresence.error)
    console.log(`Local migration file present: ${localMigrationExists}`)
  } else {
    printTable(
      Array.from(expectedIndexNames).map((indexName) => ({
        indexName,
        present: liveIndexNames.has(indexName),
      })),
    )
  }

  if (hasBlockingIssues) {
    console.error('\nIntegrity check failed: canonical auth drift still exists.')
    process.exit(1)
  }

  console.log('\nIntegrity check passed.')
}

main().catch((error) => {
  console.error('Integrity check crashed:', error)
  process.exit(1)
})
