# Architecture Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the highest-risk architecture failure modes in auth/identity, hot-path latency, transactional consistency, and security boundaries without rewriting the product.

**Architecture:** Keep the single Next.js + Supabase architecture, but converge identity on one canonical mapping, separate sync work from read APIs, move multi-step mutations behind DB-enforced invariants, and reduce the blast radius of service-role and public asset access. Sequence the work so safety and tests land before broad route rewrites.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase Auth/Postgres/Storage, pg_cron

**Confirmed repo evidence:** `src/utils/auth.ts`, `src/app/api/strava/sync/route.ts`, `src/app/api/activity/scan/route.ts`, `src/lib/rewards/workflows.ts`, `src/app/api/integrations/apple-health/route.ts`, `src/lib/openrouter.ts`, `supabase/migrations/*.sql`

---

## Phase 0: Safety Rails First

### Task 1: Add regression tests for the current weak points

**Goal:** Lock the known failure modes into tests before changing auth, rewards, or request paths.

**Files:**
- Create: `src/utils/auth.test.ts`
- Create: `src/app/api/auth/standard-login.test.ts`
- Create: `src/app/api/auth/manual-login.test.ts`
- Modify: `src/lib/rewards/workflows.test.ts`
- Modify: `src/lib/activity-attendance.test.ts`

**Steps:**
1. Add unit tests for `resolveProfileIdFromAuthUser()` covering `auth_user_id`, email-derived lookup, and missing profile cases.
2. Add route-level tests proving the current login namespace mismatch is invalid:
   `standard-login` uses `@werkudara.com`, while `manual-login` still uses `@wam.local`.
3. Add reward workflow tests covering duplicate claim attempts and sold-out races at the repository boundary.
4. Add attendance tests covering repeated completion and missing award side-effects.

**Test:**
`npx vitest run src/utils/auth.test.ts src/app/api/auth/standard-login.test.ts src/app/api/auth/manual-login.test.ts src/lib/rewards/workflows.test.ts src/lib/activity-attendance.test.ts`

**Output:**
- Failing tests that explicitly expose:
  - login namespace mismatch
  - fragile auth-to-profile resolution
  - duplicate-claim risk
  - attendance side-effect drift

---

### Task 2: Add an architecture audit script for identity and reward drift

**Goal:** Make production data drift observable before the fix lands.

**Files:**
- Create: `scripts/check_architecture_integrity.ts`

**Steps:**
1. Add checks for `profiles.auth_user_id IS NULL`, duplicate usernames, duplicate reward claims, and `rewards.total_claimed` mismatches.
2. Print actionable sections instead of raw rows:
   `identity_drift`, `reward_drift`, `attendance_drift`, `security_config`.
3. Exit non-zero when critical drift is found.

**Test:**
`npx tsx scripts/check_architecture_integrity.ts`

**Output:**
- Exit `0` when no critical drift exists.
- Exit non-zero with labeled sections when identity or reward counters are inconsistent.

---

## Phase 1: Identity and Auth Convergence

### Task 3: Make `auth_user_id` the only canonical auth-to-profile join

**Goal:** Stop resolving user context by username/email whenever a stable auth foreign key exists.

**Files:**
- Modify: `src/utils/auth.ts`
- Create: `supabase/migrations/20260310000000_backfill_profiles_auth_user_id.sql`

**Steps:**
1. Backfill `profiles.auth_user_id` from existing auth records where possible.
2. Add DB constraints and indexes so `auth_user_id` is unique and queryable.
3. Update `resolveProfileIdFromAuthUser()` to prefer `auth_user_id = auth.users.id`.
4. Keep username/email lookup only as a temporary fallback behind explicit logging.

**Test:**
- `npx vitest run src/utils/auth.test.ts`
- Run the integrity script from Task 2

**Output:**
- Auth helper resolves profile IDs from `auth_user_id` first.
- Integrity script reports zero missing canonical auth mappings for migrated users.

---

### Task 4: Unify login identity format and remove the mixed-domain bug

**Goal:** Make every login path use the same email namespace and auth lookup rules.

**Files:**
- Modify: `src/app/api/auth/standard-login/route.ts`
- Modify: `src/app/api/auth/manual-login/route.ts`
- Modify: `src/app/api/admin/users/create/route.ts`
- Modify: `src/app/api/profile/update/route.ts`
- Modify: `src/lib/auth/login.ts`

**Steps:**
1. Pick one canonical synthetic email format and use it everywhere.
2. Remove `@wam.local` usage from `manual-login`.
3. Stop writing plaintext password updates into `profiles.password`.
4. If a compatibility column must remain temporarily, stop reading it for login.

**Test:**
`npx vitest run src/app/api/auth/standard-login.test.ts src/app/api/auth/manual-login.test.ts src/lib/auth/login.test.ts`

**Output:**
- Both login routes authenticate the same user namespace.
- Profile updates no longer persist plaintext passwords into business tables.

---

### Task 5: Migrate high-traffic user routes to canonical auth context

**Goal:** Remove the risky pattern where user routes depend on numeric-ID bridging and broad admin reads.

**Files:**
- Modify: `src/app/api/strava/sync/route.ts`
- Modify: `src/app/api/rewards/list/route.ts`
- Modify: `src/app/api/rewards/claim/route.ts`
- Modify: `src/app/api/quests/claim/route.ts`
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/app/api/profile/update/route.ts`

**Steps:**
1. Replace ad hoc profile resolution with one shared auth-context helper.
2. Minimize use of `createSupabaseAdminClient()` in user-only reads.
3. Centralize “load current profile” logic in one helper instead of reimplementing it in routes.
4. Add explicit `404 profile not found` telemetry where fallback resolution is still needed.

**Test:**
`npm run build`

**Output:**
- Build passes.
- No user-facing route depends on username-derived identity as its primary path.

---

## Phase 2: Hot Path and Dependency Isolation

### Task 6: Split `/api/strava/sync` into sync and read responsibilities

**Goal:** Stop using a slow third-party synchronization endpoint as the main profile read API.

**Files:**
- Create: `src/lib/strava/sync.ts`
- Create: `src/app/api/profile/summary/route.ts`
- Modify: `src/app/api/strava/sync/route.ts`
- Modify: `src/hooks/use-swr-hooks.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/profile/settings/page.tsx`

**Steps:**
1. Move Strava token refresh and Strava fetch/write logic into a dedicated service.
2. Make `/api/profile/summary` read only from Supabase-local state.
3. Keep `/api/strava/sync` as an explicit mutation-like sync endpoint.
4. Update SWR hooks so dashboard/profile default to the summary endpoint, not live sync.

**Test:**
- `npm run build`
- `npx vitest run src/lib/points.test.ts src/lib/gamification.test.ts src/lib/rewards/service.test.ts`

**Output:**
- Dashboard/profile read from a local aggregate endpoint.
- Strava outages no longer sit on the default page-load critical path.

---

### Task 7: Reduce client polling pressure and add explicit refresh points

**Goal:** Lower avoidable background load from SWR and make expensive refreshes user-driven.

**Files:**
- Modify: `src/hooks/use-swr-hooks.ts`
- Modify: `src/app/leaderboard/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/profile/page.tsx`

**Steps:**
1. Increase dedupe intervals on expensive endpoints.
2. Keep frequent polling only where product value is real.
3. Add explicit `Refresh` actions for heavy data sources instead of aggressive revalidate-on-focus.
4. Ensure optimistic UI still works for quests/rewards after claim actions.

**Test:**
`npm run build`

**Output:**
- SWR defaults are less aggressive on expensive routes.
- Normal navigation does not trigger avoidable Strava-backed refreshes.

---

### Task 8: Make OpenRouter checks bounded and policy-driven

**Goal:** Prevent external LLM latency or outage from silently changing business rules.

**Files:**
- Modify: `src/lib/openrouter.ts`
- Modify: `src/app/api/quests/claim/route.ts`
- Modify: `src/app/api/user/message/route.ts`

**Steps:**
1. Add request timeout handling and structured error codes.
2. Replace unconditional fail-open with an explicit policy:
   allow by config for low-risk UX, block or mark `needs_review` for sensitive flows.
3. Return deterministic fallback responses to callers.

**Test:**
- Create and run: `src/lib/openrouter.test.ts`
- `npx vitest run src/lib/openrouter.test.ts`

**Output:**
- Provider timeout and 429 cases produce known responses.
- Message and quest routes no longer silently treat every outage as positive sentiment.

---

## Phase 3: Transactional Consistency

### Task 9: Reintroduce hard reward-claim invariants at the database layer

**Goal:** Prevent duplicate or oversold claims even if the route is retried or runs concurrently.

**Files:**
- Create: `supabase/migrations/20260310000001_reward_claim_invariants.sql`
- Modify: `src/lib/rewards/workflows.ts`
- Modify: `src/lib/rewards/workflows.test.ts`

**Steps:**
1. Decide which reward types may be claimed once vs many times.
2. Restore the matching unique constraints or partial unique indexes in SQL.
3. Replace stale read-then-increment logic with one DB-enforced mutation path.
4. Stop using `reward.total_claimed + 1` from previously read state.

**Test:**
`npx vitest run src/lib/rewards/workflows.test.ts`

**Output:**
- Duplicate claims fail deterministically.
- Sold-out rewards cannot oversubscribe under concurrent requests.

---

### Task 10: Move attendance completion into one transactional path

**Goal:** Keep `attendance`, `point_adjustments`, and `notifications` consistent across scan-out and cron finalization.

**Files:**
- Create: `supabase/migrations/20260310000002_attendance_finalize_rpc.sql`
- Modify: `src/app/api/activity/scan/route.ts`
- Modify: `supabase/migrations/20260217000002_activity_penalty_cron.sql`
- Modify: `supabase/migrations/20260217000003_adjust_activity_penalty_cron_frequency.sql`
- Modify: `src/lib/activity-attendance.test.ts`

**Steps:**
1. Add a single SQL function/RPC to finalize attendance and award side-effects atomically.
2. Reuse the same RPC from the route handler and the cron job.
3. Make repeated finalization idempotent.
4. Log whether a call produced a new award or was a no-op.

**Test:**
- `npx vitest run src/lib/activity-attendance.test.ts`
- Run manual SQL verification against a test attendance row

**Output:**
- Finalizing the same attendance twice produces one point adjustment and one notification.
- Route path and cron path share the same side-effect behavior.

---

### Task 11: Make reply-bonus awarding idempotent

**Goal:** Prevent duplicate reward points when reply flows are retried or race.

**Files:**
- Modify: `src/app/api/user/message/route.ts`
- Create: `supabase/migrations/20260310000003_reply_bonus_idempotency.sql`

**Steps:**
1. Add an idempotency marker or dedicated reward ledger for reply bonuses.
2. Replace “check then insert then update many rows” with one mutation boundary.
3. Keep the notification write separate from the bonus invariant.

**Test:**
- Create and run: `src/app/api/user/message.test.ts`
- `npx vitest run src/app/api/user/message.test.ts`

**Output:**
- Repeating the same reply does not award points twice.
- Bonus notification count matches bonus ledger entries.

---

## Phase 4: Security Boundary Hardening

### Task 12: Remove service-role fallback from QR signing and harden Apple Health sync

**Goal:** Decouple user-facing token systems from the highest-privilege secret and reduce abuse of shared sync keys.

**Files:**
- Modify: `src/app/api/activity/scan/route.ts`
- Modify: `src/app/api/admin/activities/token/route.ts`
- Modify: `src/app/api/integrations/apple-health/route.ts`
- Modify: `src/app/api/integrations/get-key/route.ts`

**Steps:**
1. Require `ACTIVITY_QR_SECRET`; remove fallback to `SUPABASE_SERVICE_ROLE_KEY`.
2. Rotate Apple Health from a static bearer-style `sync_key` toward revocable, hashed, per-user credentials.
3. Add basic request throttling or replay protection for the Apple Health endpoint.
4. Stop returning raw long-lived secrets unless explicitly regenerated.

**Test:**
- `npm run build`
- Manual API checks:
  - missing QR secret returns `500` with explicit config error
  - invalid Apple Health credential returns `401`

**Output:**
- QR tokens are never signed with the service-role secret.
- Apple Health sync accepts only scoped credentials and rejects replay/invalid requests.

---

### Task 13: Tighten storage bucket policies for quest proofs and doorprize assets

**Goal:** Prevent arbitrary authenticated users from reading or mutating unrelated objects.

**Files:**
- Create: `supabase/migrations/20260310000004_harden_storage_policies.sql`
- Modify: `supabase/migrations/20260305100000_fix_quest_proofs_bucket.sql`
- Modify: `supabase/migrations/20260108000004_create_doorprize_storage.sql`
- Modify: `src/components/DailyQuests.tsx`
- Modify: `src/app/doorprize/[id]/page.tsx`

**Steps:**
1. Change bucket policies from broad authenticated access to owner/path-scoped access.
2. Keep public read only where it is truly required; otherwise use signed URLs.
3. Move client uploads behind server-mediated path generation if current paths are guessable.
4. Document bucket naming and retention rules.

**Test:**
- Manual storage policy verification in Supabase:
  - uploader can read own object
  - another authenticated user cannot update/delete it
  - public access only works for explicitly public assets

**Output:**
- Quest proof uploads remain functional.
- Cross-user overwrite/delete is blocked by storage policy.

---

## Phase 5: Final Verification and Rollout

### Task 14: Run full verification and produce rollback notes

**Goal:** Prove the fix set is safe before rollout and leave an operator-ready checklist.

**Files:**
- Modify: `docs/plans/2026-03-10-architecture-remediation-plan.md`
- Create: `docs/architecture-remediation-rollout.md`

**Steps:**
1. Run targeted tests from Tasks 1-13.
2. Run full suite and build.
3. Execute the integrity audit script.
4. Write rollback notes for:
   auth migration,
   reward invariants,
   attendance RPC,
   storage policy changes.

**Test:**
- `npx vitest run`
- `npm run build`
- `npx tsx scripts/check_architecture_integrity.ts`

**Output:**
- All tests green.
- Build green.
- Integrity script returns exit `0`.
- Rollout doc includes deploy order, smoke tests, and rollback points.

---

## Recommended Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

## Parallelizable Streams After Task 4

- **Stream A: Identity/Auth**
  Tasks 5
- **Stream B: Hot Path**
  Tasks 6-8
- **Stream C: Consistency/Security**
  Tasks 9-13

## Suggested Subagent Split

- **Subagent 1:** Identity/Auth convergence
- **Subagent 2:** Strava/SWR/OpenRouter hot-path isolation
- **Subagent 3:** Reward/attendance transactional hardening
- **Subagent 4:** Apple Health + storage policy hardening

These streams should merge only after Task 4 is complete, because Task 4 establishes the shared identity rules used by the other tasks.

