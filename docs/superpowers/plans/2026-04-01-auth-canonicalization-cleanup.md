# Auth Canonicalization Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge all login paths onto canonical `@werkudara.com` auth identities, preserve existing profile-linked history, reset auth credentials, and safely remove duplicate `@wam.local` auth users.

**Architecture:** Keep `public.profiles.id` and all downstream history tables unchanged, backfill `profiles.auth_user_id` to canonical auth users, and move runtime auth resolution to `auth_user_id` first. Rollout happens in two layers: runtime safeguards and verification land before destructive cleanup, then data repair and legacy-auth deletion run only after integrity checks and smoke validation pass.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase Auth/Postgres, `@supabase/ssr`, `@supabase/supabase-js`

---

## Chunk 1: Runtime Safeguards And Verification Rails

### Task 1: Add failing coverage for canonical auth behavior

**Files:**
- Create: `src/app/api/auth/manual-login/route.test.ts`
- Modify: `src/app/api/auth/standard-login/route.test.ts`
- Create: `src/utils/auth.test.ts`
- Create: `src/app/api/admin/users/create/route.test.ts`

- [ ] **Step 1: Write the failing standard-login normalization test**

```ts
it('normalizes username casing before deriving the canonical werkudara email', async () => {
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { session: { access_token: 'token' }, user: { id: 'auth-id' } },
    error: null,
  })

  createSupabaseServerClientMock.mockResolvedValue({
    auth: { signInWithPassword },
  } as never)

  await POST(
    new Request('http://localhost:3000/api/auth/standard-login', {
      method: 'POST',
      body: JSON.stringify({ username: 'Abilio', password: 'werkudara88' }),
    }),
  )

  expect(signInWithPassword).toHaveBeenCalledWith({
    email: 'abilio@werkudara.com',
    password: 'werkudara88',
  })
})
```

- [ ] **Step 2: Run the focused standard-login test to verify it fails**

Run: `npx vitest run src/app/api/auth/standard-login/route.test.ts`
Expected: FAIL because the route still uses the raw username string.

- [ ] **Step 3: Write the failing manual-login canonical-email test**

```ts
it('signs access-code users into the canonical werkudara identity without reading profiles.password', async () => {
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { session: { access_token: 'token' }, user: { id: 'auth-id' } },
    error: null,
  })

  createSupabaseAdminClientMock.mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: -1, username: 'Abilio', password: 'legacy-pass' },
            error: null,
          }),
        }),
      }),
    }),
  } as never)

  createSupabaseServerClientMock.mockResolvedValue({
    auth: { signInWithPassword },
  } as never)

  await POST(
    new Request('http://localhost:3000/api/auth/manual-login', {
      method: 'POST',
      body: JSON.stringify({ accessCode: 'CODE-8193' }),
    }),
  )

  expect(signInWithPassword).toHaveBeenCalledWith({
    email: 'abilio@werkudara.com',
    password: 'werkudara88',
  })
})
```

- [ ] **Step 4: Run the focused manual-login test to verify it fails**

Run: `npx vitest run src/app/api/auth/manual-login/route.test.ts`
Expected: FAIL because the route still signs into `@wam.local` with `profiles.password`.

- [ ] **Step 5: Write the failing auth-context resolution test**

```ts
it('prefers profiles.auth_user_id over username-derived fallback', async () => {
  adminClient.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: -1767174261883 },
          error: null,
        }),
      }),
    }),
  })

  const result = await resolveProfileIdFromAuthUser({
    id: '706dabb3-a2b4-49ad-9832-975c9cea26ac',
    email: 'abilio@werkudara.com',
  })

  expect(result).toBe(-1767174261883)
})
```

- [ ] **Step 6: Run the focused auth-context test to verify it fails**

Run: `npx vitest run src/utils/auth.test.ts`
Expected: FAIL because the helper does not query `auth_user_id` first.

- [ ] **Step 7: Write the failing admin-create linkage test**

```ts
it('creates a bigint profile row linked by auth_user_id instead of writing the auth UUID into profiles.id', async () => {
  // Assert insert payload contains auth_user_id and does not replace bigint id.
})
```

- [ ] **Step 8: Run the focused admin-create test to verify it fails**

Run: `npx vitest run src/app/api/admin/users/create/route.test.ts`
Expected: FAIL because the route currently inserts `authUser.user.id` into `profiles.id`.

- [ ] **Step 9: Write the failing admin-create collision test**

```ts
it('rejects usernames that collide after canonical lowercasing', async () => {
  // Existing profile username "Abilio" should block creation of "abilio".
})
```

- [ ] **Step 10: Re-run the focused admin-create test file to verify the collision test fails**

Run: `npx vitest run src/app/api/admin/users/create/route.test.ts`
Expected: FAIL because the route still treats differently cased usernames as distinct.

- [ ] **Step 11: Commit the failing-test baseline**

```bash
git add src/app/api/auth/standard-login/route.test.ts src/app/api/auth/manual-login/route.test.ts src/utils/auth.test.ts src/app/api/admin/users/create/route.test.ts
git commit -m "test: capture auth canonicalization regressions"
```

### Task 2: Implement canonical runtime behavior

**Files:**
- Modify: `src/app/api/auth/standard-login/route.ts`
- Modify: `src/app/api/auth/manual-login/route.ts`
- Modify: `src/utils/auth.ts`
- Modify: `src/app/api/admin/users/create/route.ts`
- Modify: `src/lib/auth/login.ts` if shared normalization logic is needed

- [ ] **Step 1: Add a small canonical-username helper**

```ts
function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}
```

- [ ] **Step 2: Update `standard-login` to use normalized canonical email**

```ts
const normalizedUsername = normalizeUsername(username)
const { error } = await supabase.auth.signInWithPassword({
  email: `${normalizedUsername}@werkudara.com`,
  password,
})
```

- [ ] **Step 3: Update `manual-login` to stop reading `profiles.password` for auth**

```ts
const normalizedUsername = normalizeUsername(user.username)
const resetPassword = process.env.AUTH_CANONICAL_RESET_PASSWORD ?? 'werkudara88'
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: `${normalizedUsername}@werkudara.com`,
  password: resetPassword,
})
```

- [ ] **Step 4: Update `resolveProfileIdFromAuthUser()` to prefer `auth_user_id`**

```ts
const byAuthId = await adminClient
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .maybeSingle()
```

- [ ] **Step 5: Keep username/email fallback with explicit warning log**

```ts
console.warn('Falling back to username-derived profile lookup for auth user', {
  authUserId: user.id,
  email: user.email,
})
```

- [ ] **Step 6: Fix admin user creation to preserve bigint profile IDs**

Implementation notes:
- leave `profiles.id` to the existing bigint strategy,
- set `auth_user_id: authUser.user.id`,
- use case-insensitive username existence checks,
- stop inserting UUID into `profiles.id`.

- [ ] **Step 7: Run focused tests until green**

Run: `npx vitest run src/app/api/auth/standard-login/route.test.ts src/app/api/auth/manual-login/route.test.ts src/utils/auth.test.ts src/app/api/admin/users/create/route.test.ts`
Expected: PASS

- [ ] **Step 8: Commit the runtime fix**

```bash
git add src/app/api/auth/standard-login/route.ts src/app/api/auth/manual-login/route.ts src/utils/auth.ts src/app/api/admin/users/create/route.ts src/lib/auth/login.ts
git commit -m "fix: canonicalize auth runtime to werkudara identities"
```

### Task 3: Add integrity checks and schema invariants before destructive cleanup

**Files:**
- Create: `scripts/check_auth_canonicalization_integrity.ts`
- Create: `supabase/migrations/20260401000000_auth_canonicalization_guards.sql`

- [ ] **Step 1: Write the failing integrity script expectations**

The script should report:
- profiles missing `auth_user_id`,
- canonical-email mismatches,
- remaining duplicate auth rows per normalized username,
- missing unique indexes `profiles_auth_user_id_unique` and `profiles_username_canonical_unique`,
- direct `auth.users` references that still point at legacy `@wam.local` rows.

- [ ] **Step 2: Add the migration with concrete DDL**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique
ON public.profiles (auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_canonical_unique
ON public.profiles ((lower(trim(username))))
WHERE username IS NOT NULL;
```

- [ ] **Step 3: Implement the integrity script queries**

Implementation notes:
- use the existing Supabase admin client pattern from repo scripts,
- print labeled sections instead of raw rows,
- enumerate every direct `auth.users` reference from the live schema rather than hardcoding only `survey_submissions`,
- enumerate every `public.profiles.id` dependent table in scope so history verification is dependency-complete,
- exit non-zero when canonical drift or missing indexes are found.

- [ ] **Step 4: Run the integrity script before cleanup and verify it fails**

Run: `npx tsx scripts/check_auth_canonicalization_integrity.ts`
Expected: FAIL because current data still has null `auth_user_id`, duplicates, and missing unique indexes.

- [ ] **Step 5: Apply or stage the migration and re-run the script after runtime fixes**

Run: `npx tsx scripts/check_auth_canonicalization_integrity.ts`
Expected: still FAIL until data repair is complete, but the missing-index section should be resolved.

- [ ] **Step 6: Commit the integrity rails**

```bash
git add scripts/check_auth_canonicalization_integrity.ts supabase/migrations/20260401000000_auth_canonicalization_guards.sql
git commit -m "feat: add auth canonicalization integrity guards"
```

## Chunk 2: Data Repair, Cleanup, And Final Verification

### Task 4: Build the data-repair and legacy-auth audit script

**Files:**
- Create: `scripts/canonicalize-auth-users.ts`

- [ ] **Step 1: Implement a dry-run summary first**

The script should report, per username:
- profile bigint ID,
- canonical `@werkudara.com` auth ID,
- legacy `@wam.local` auth ID,
- whether `auth_user_id` needs update,
- whether deletion is blocked by direct `auth.users` references.

- [ ] **Step 2: Add the non-destructive repair operations**

Implementation order:
1. update canonical auth metadata and password to `AUTH_CANONICAL_RESET_PASSWORD` or `werkudara88`,
2. backfill `profiles.auth_user_id`,
3. audit direct `auth.users` references,
4. stop before deletion unless `--apply-delete` is explicitly set.

- [ ] **Step 3: Add session-revocation support**

Implementation notes:
- prefer Supabase auth client surfaces over direct SQL,
- use `supabase.auth.admin.signOut(jwt, 'global')` wherever a revocable session JWT is available,
- document that revoked refresh tokens do not instantly invalidate existing access tokens,
- record a concrete revocation result per affected user: `revoked`, `no_active_session`, or `awaiting_access_token_expiry`,
- fail apply mode if the script cannot classify the revocation state for a user cleanly.

- [ ] **Step 4: Run the script in dry-run mode**

Run: `npx tsx scripts/canonicalize-auth-users.ts --dry-run`
Expected: shows 59 canonical links and 59 legacy deletions pending.

- [ ] **Step 5: Commit the script before apply mode**

```bash
git add scripts/canonicalize-auth-users.ts
git commit -m "feat: add auth canonicalization repair script"
```

### Task 5: Execute non-destructive repair and verify preserved history

**Files:**
- Modify: generated data only

- [ ] **Step 1: Run the repair script without deletion**

Run: `npx tsx scripts/canonicalize-auth-users.ts --apply`
Expected:
- `profiles.auth_user_id` backfilled for canonical users
- canonical auth passwords reset
- legacy auth rows retained for now

- [ ] **Step 2: Re-run the integrity script**

Run: `npx tsx scripts/check_auth_canonicalization_integrity.ts`
Expected:
- no profiles missing `auth_user_id`
- no canonical mismatch section
- only legacy-auth presence remains, if deletion has not happened yet

- [ ] **Step 3: Verify history stayed attached to bigint profile IDs**

Run dependency-complete read-only checks for:
- every table that references `public.profiles.id`,
- every table or column that references `auth.users.id`,
- row counts and nullability expectations before and after repair.

Expected:
- row counts by `profiles.id` remain unchanged pre/post repair,
- direct `auth.users` references match the declared preserve/remap/null policy,
- no new orphaned foreign-key behavior appears after canonical linkage.

- [ ] **Step 4: Run focused auth tests and build**

Run: `npx vitest run src/app/api/auth/standard-login/route.test.ts src/app/api/auth/manual-login/route.test.ts src/utils/auth.test.ts src/app/api/admin/users/create/route.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit the non-destructive repair result**

```bash
git add -A
git commit -m "fix: backfill canonical auth linkage"
```

### Task 6: Perform destructive cleanup only after operator confirmation

**Files:**
- Modify: generated data only

- [ ] **Step 1: Present destructive action summary to the operator**

Include:
- number of `@wam.local` auth users to delete,
- whether any direct `auth.users` references still block deletion,
- session-revocation result counts (`revoked`, `no_active_session`, `awaiting_access_token_expiry`),
- the current project JWT expiry window and the earliest safe delete time if any users are still in `awaiting_access_token_expiry`.

- [ ] **Step 2: Wait for explicit approval before deletion**

Do not continue until the user confirms the destructive cleanup.

- [ ] **Step 3: Enforce the session-revocation hard gate**

Only continue when one of these is true for every affected user:
- revocation status is `revoked` or `no_active_session`, or
- the recorded access-token grace window has elapsed and refresh verification now fails.

If any user still sits in an unexpired `awaiting_access_token_expiry` state, stop and do not delete legacy auth rows yet.

- [ ] **Step 4: Delete legacy auth users**

Run: `npx tsx scripts/canonicalize-auth-users.ts --apply --apply-delete`
Expected: `@wam.local` auth rows removed only for users whose canonical linkage is clean.

- [ ] **Step 5: Re-run integrity script**

Run: `npx tsx scripts/check_auth_canonicalization_integrity.ts`
Expected: PASS with zero duplicate auth identities and zero remaining legacy rows.

- [ ] **Step 6: Re-run smoke verification**

Manual smoke:
- login with `Abilio` + `werkudara88`
- access-code login for one manual user
- admin login
- create one test user from admin flow

- [ ] **Step 7: Commit the destructive cleanup**

```bash
git add -A
git commit -m "fix: remove legacy wam auth identities"
```

### Task 7: Final review, QA evidence, and residual-risk note

**Files:**
- Modify: `docs/exec_plans.md` if status or risk notes change

- [ ] **Step 1: Capture final verification evidence**

Summarize:
- focused Vitest output,
- `npm run build`,
- integrity script output,
- smoke results,
- session-revocation observations and grace window.

- [ ] **Step 2: Send changed files through reviewer and QA gates**

Reviewer focus:
- auth/session drift,
- schema invariants,
- destructive cleanup correctness.

QA focus:
- login paths,
- manual-login behavior,
- post-cleanup session behavior,
- no history loss.

- [ ] **Step 3: Update `docs/exec_plans.md` status and residual risk**

Record:
- shared reset password is temporary,
- access-token grace window remains bounded by JWT expiry,
- fallback username-resolution logging should be monitored and later removed.

- [ ] **Step 4: Final commit if review-driven doc changes are needed**

```bash
git add docs/exec_plans.md
git commit -m "docs: record auth canonicalization rollout status"
```
