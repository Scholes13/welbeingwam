# Settings Schema Drift Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing `public.settings` contract and harden backend and frontend flows so settings and Strava failures surface clearly instead of silently degrading into misleading defaults.

**Architecture:** Recreate the missing database table with an idempotent migration, centralize settings parsing so JSONB values are handled consistently, and harden API consumers so missing settings no longer masquerade as live configuration. Frontend settings consumers should fail safely, with admin surfaces showing explicit load errors and shared fetchers throwing on non-2xx responses.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Supabase Postgres migrations, SWR

---

## Chunk 1: Backend Contract Repair

### Task 1: Centralize settings parsing and persistence shape

**Files:**
- Create: `src/lib/settings.ts`
- Create: `src/lib/settings.test.ts`
- Modify: `src/app/api/settings/route.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- parsing numeric and boolean JSONB values from settings rows,
- preserving default values when a key is absent,
- building upsert rows with native number and boolean values instead of stringifying them.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/settings.test.ts`
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement a focused helper that:
- exposes default settings,
- parses settings rows into the API response shape,
- detects the missing-table drift case,
- and builds deterministic rows for `PUT /api/settings`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings.test.ts`
Expected: PASS

### Task 2: Harden the settings API and repair the database contract

**Files:**
- Create: `src/app/api/settings/route.test.ts`
- Create: `supabase/migrations/20260401001000_restore_settings_table.sql`
- Modify: `src/app/api/settings/route.ts`
- Modify: `docs/exec_plans.md`

- [ ] **Step 1: Write the failing tests**

Add route tests for:
- `GET /api/settings` correctly parsing JSONB-backed booleans and numbers,
- `GET /api/settings` returning an explicit failure when the table contract is unavailable,
- `PUT /api/settings` upserting native JSON values.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/settings/route.test.ts`
Expected: FAIL because the current route stringifies values and does not distinguish schema drift cleanly.

- [ ] **Step 3: Write minimal implementation**

Update the route to use the shared helper and add an idempotent migration that recreates `public.settings` plus default rows when missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/settings/route.test.ts src/lib/settings.test.ts`
Expected: PASS

## Chunk 2: Strava and Frontend Hardening

### Task 3: Make Strava cooldown fallback explicit and keep sync alive

**Files:**
- Modify: `src/app/api/strava/sync/route.ts`
- Modify: `src/app/api/settings/route.test.ts`

- [ ] **Step 1: Write the failing test**

Extend route-level coverage or helper coverage so the missing-settings case is recognized as drift and the cooldown falls back without crashing the sync response path.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/settings/route.test.ts src/lib/strava/sync.test.ts`
Expected: FAIL because the missing-table case is only logged today and not coordinated through shared helpers.

- [ ] **Step 3: Write minimal implementation**

Reuse the shared missing-table detection in the Strava sync route so the fallback behavior is intentional and consistent.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings.test.ts src/app/api/settings/route.test.ts src/lib/strava/sync.test.ts`
Expected: PASS

### Task 4: Fail safely in the frontend when settings or Strava loads fail

**Files:**
- Create: `src/lib/fetch-json.ts`
- Create: `src/lib/fetch-json.test.ts`
- Modify: `src/hooks/use-swr-hooks.ts`
- Modify: `src/context/SettingsContext.tsx`
- Modify: `src/app/dashboard/admin/settings/page.tsx`
- Modify: `src/app/map/page.tsx`
- Modify: `src/app/profile/settings/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/quests/page.tsx`
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Write the failing tests**

Add fetch helper tests for:
- returning parsed JSON on success,
- throwing a meaningful error on non-2xx responses,
- falling back to a generic message when the response body is not JSON.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/fetch-json.test.ts`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a shared fetch helper, wire SWR and page-level fetches through it, stop `SettingsContext` from silently substituting optimistic defaults on fetch errors, and add explicit error states to admin/profile/dashboard/quests/leaderboard flows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/fetch-json.test.ts`
Expected: PASS

## Chunk 3: Verification

### Task 5: Verify the full fix

**Files:**
- Modify: `docs/exec_plans.md`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/lib/settings.test.ts src/app/api/settings/route.test.ts src/lib/fetch-json.test.ts src/lib/strava/sync.test.ts`
Expected: PASS

- [ ] **Step 2: Run broader regression coverage**

Run: `npm test -- src/lib/gamification.test.ts src/app/api/profile/update/route.test.ts`
Expected: PASS

- [ ] **Step 3: Run the application build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Apply the schema repair migration to the connected Supabase project**

Run: apply the SQL from `supabase/migrations/20260401001000_restore_settings_table.sql` through the Supabase MCP migration tool.
Expected: the live project regains `public.settings` and seeded defaults without duplicating rows.
