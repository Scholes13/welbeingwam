# Strava Sport Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the current Strava integration from estimated-step imports into cooldown-based sport-session sync that stores all Strava activities as history and awards physical activity points only when detailed activity calories are available.

**Architecture:** Keep Strava account binding on the profile and move sync behavior behind a cooldown gate backed by the existing `settings` table. Split summary discovery from detail hydration so only new or incomplete Strava activities consume detail requests, then upsert those records into `activities` by stable external identity while preserving admin moderation state.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Vitest

---

### Task 1: Add failing tests for Strava sport sync rules

**Files:**
- Create: `src/lib/strava/sync.test.ts`
- Modify: `src/lib/gamification.test.ts`

**Step 1: Write the failing test**

```ts
it('awards activity points only when strava detail includes calories', async () => {
  const result = mergeStravaActivity({
    summary: { id: 1, name: 'Lunch Ride', type: 'Ride', distance: 12000, moving_time: 1800, start_date: '2026-03-11T01:00:00Z' },
    detail: { calories: 420 },
    existing: null,
    physicalDimensionId: 'dim-physical',
    userId: 'user-1',
  })

  expect(result.mode).toBe('sport')
  expect(result.source).toBe('strava')
  expect(result.activity_points).toBe(420)
  expect(result.steps).toBe(0)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/strava/sync.test.ts src/lib/gamification.test.ts`

Expected: FAIL because `mergeStravaActivity` and the new Strava sync rules do not exist yet.

**Step 3: Write minimal implementation**

Create small pure helpers in `src/lib/strava/sync.ts` for cooldown checks, summary/detail merge, and moderation-safe upsert payload creation.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/strava/sync.test.ts src/lib/gamification.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/strava/sync.ts src/lib/strava/sync.test.ts src/lib/gamification.test.ts
git commit -m "test: codify strava sport sync rules"
```

### Task 2: Extend schema and settings for Strava sync metadata

**Files:**
- Create: `supabase/migrations/20260311000001_add_strava_sync_metadata.sql`
- Modify: `supabase/migrations/20260129000004_seed_default_data.sql`
- Modify: `src/app/api/settings/route.ts`

**Step 1: Write the failing test**

Add or update a small route/helper test if present; otherwise rely on targeted type-level verification in Task 4. The important contract is that a settings fallback of `15` exists and can be overridden by `strava_sync_cooldown_minutes`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/strava/sync.test.ts`

Expected: FAIL because settings parsing and schema metadata are still missing.

**Step 3: Write minimal implementation**

Add:
- profile column `last_strava_sync_at`
- activity columns such as `external_id`, `sport_type`, `has_calories`, `last_synced_at`
- unique index for Strava rows keyed by source + external ID
- default settings seed `strava_sync_cooldown_minutes = 15`
- settings API support for reading/updating that cooldown

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/strava/sync.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/migrations/20260311000001_add_strava_sync_metadata.sql supabase/migrations/20260129000004_seed_default_data.sql src/app/api/settings/route.ts
git commit -m "db: add strava sync metadata and cooldown setting"
```

### Task 3: Implement cooldown-gated Strava sync service

**Files:**
- Create: `src/lib/strava/sync.ts`
- Modify: `src/app/api/strava/sync/route.ts`

**Step 1: Write the failing test**

```ts
it('skips strava API calls when cooldown has not elapsed', async () => {
  const shouldSync = shouldRunStravaSync({
    lastSyncedAt: '2026-03-11T10:00:00Z',
    now: '2026-03-11T10:10:00Z',
    cooldownMinutes: 15,
  })

  expect(shouldSync).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/strava/sync.test.ts`

Expected: FAIL because cooldown helper does not exist yet.

**Step 3: Write minimal implementation**

Move Strava logic out of the route into `src/lib/strava/sync.ts`:
- refresh access token if needed
- read cooldown from settings
- short-circuit to DB data when still inside cooldown
- fetch activity summaries only when sync is allowed
- fetch detail payload only for new or incomplete Strava records

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/strava/sync.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/strava/sync.ts src/app/api/strava/sync/route.ts src/lib/strava/sync.test.ts
git commit -m "feat: add cooldown-gated strava sport sync service"
```

### Task 4: Upsert Strava activities as sport sessions without overwriting admin moderation

**Files:**
- Modify: `src/lib/strava/sync.ts`
- Modify: `src/app/api/strava/sync/route.ts`
- Modify: `src/lib/gamification.ts`

**Step 1: Write the failing test**

```ts
it('preserves voided review status when a strava activity is re-synced', async () => {
  const result = mergeStravaActivity({
    summary: { id: 2, name: 'Evening Run', type: 'Run', distance: 5000, moving_time: 1500, start_date: '2026-03-11T12:00:00Z' },
    detail: { calories: 300 },
    existing: { review_status: 'voided', activity_points: 0 },
    physicalDimensionId: 'dim-physical',
    userId: 'user-1',
  })

  expect(result.review_status).toBe('voided')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/strava/sync.test.ts src/lib/gamification.test.ts`

Expected: FAIL because current merge behavior overwrites moderation state or does not support the contract.

**Step 3: Write minimal implementation**

Ensure Strava upsert payloads:
- set `mode='sport'`
- set `steps=0`
- set `activity_points=calories` or `0`
- keep `proof_url=null`
- store all activities as history even when calories are missing
- preserve admin review fields when an existing row is already moderated

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/strava/sync.test.ts src/lib/gamification.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/strava/sync.ts src/app/api/strava/sync/route.ts src/lib/gamification.ts src/lib/strava/sync.test.ts src/lib/gamification.test.ts
git commit -m "feat: upsert strava activities as sport history"
```

### Task 5: Expose Strava source metadata to dashboard and admin

**Files:**
- Modify: `src/hooks/use-swr-hooks.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/admin/page.tsx`

**Step 1: Write the failing test**

If no component tests exist, use build verification as the contract and document the expected UI behavior:
- Strava records render as sport history
- records without calories show zero sport points
- source is visible to admins

**Step 2: Run verification to confirm missing behavior**

Run: `npx next build --webpack`

Expected: PASS on existing code, but manual inspection shows no Strava-specific source rendering yet.

**Step 3: Write minimal implementation**

Update the shared activity payload and UI to show:
- `source='strava'`
- calories-derived sport points or zero
- optional admin source badges or filters for future debugging

**Step 4: Run verification to confirm it builds**

Run: `npx next build --webpack`

Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/use-swr-hooks.ts src/app/dashboard/page.tsx src/app/dashboard/admin/page.tsx
git commit -m "feat: expose strava sport session metadata in ui"
```

### Task 6: Full verification

**Files:**
- Test: `src/lib/strava/sync.test.ts`
- Test: `src/lib/gamification.test.ts`
- Test: `src/lib/points.test.ts`
- Test: `src/lib/rewards/service.test.ts`

**Step 1: Run targeted tests**

Run: `npm test -- src/lib/strava/sync.test.ts src/lib/gamification.test.ts src/lib/points.test.ts src/lib/rewards/service.test.ts`

Expected: PASS

**Step 2: Run focused lint/build verification**

Run: `npx eslint src/lib/strava/sync.ts src/app/api/strava/sync/route.ts src/app/api/settings/route.ts src/app/dashboard/page.tsx src/hooks/use-swr-hooks.ts`

Expected: PASS or only pre-existing warnings

**Step 3: Run production build verification**

Run: `npx next build --webpack`

Expected: PASS

**Step 4: Commit**

```bash
git add .
git commit -m "feat: sync strava sport sessions with cooldown gating"
```
