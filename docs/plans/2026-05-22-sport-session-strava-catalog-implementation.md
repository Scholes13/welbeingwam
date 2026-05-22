# Sport Session Strava Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand Sport Session to a popular calories-friendly Strava-aligned catalog and require a custom sport name when `Other` is selected.

**Architecture:** Keep `activity_types` as the catalog source of truth. Add one Supabase migration for sport seeds and minimal frontend/backend changes so `sport.other` can collect and persist a custom sport name.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres migrations, Vitest, Tailwind CSS.

---

### Task 1: Backend Validation Test

**Files:**
- Modify: `src/app/api/activities/create/route.test.ts` if present; otherwise create focused test near existing route tests.
- Modify: `src/app/api/activities/create/route.ts`

**Step 1: Find existing test surface**

Search for activity create tests:

```powershell
rg "Create Activity|activities/create|custom_name|sport session" src -g "*.test.ts"
```

Expected: existing focused test file, or no match.

**Step 2: Write failing tests**

Add coverage for:
- sport `Other` with no `custom_name` returns `400`.
- sport `Other` with `custom_name = "Padel"` inserts `name = "Padel"`, `type = "Other"`, `custom_name = "Padel"`, and calories-based points.
- non-Other sport does not require `custom_name`.

**Step 3: Run focused test**

Run exact focused command after locating test file:

```powershell
npx vitest run <test-file>
```

Expected: FAIL before route change.

**Step 4: Implement minimal route support**

In `src/app/api/activities/create/route.ts`:
- Include `is_custom_input` in sport lookup result.
- For sport rows, resolve selected `activity_types` row by `mode = 'sport'`, `name = rawType`, `is_active = true`.
- If selected sport row has `is_custom_input = true`, require `customName`.
- Use `displayName = customName` for custom sport; keep `type = rawType`.
- Keep sport points equal to calories and approval behavior unchanged.

**Step 5: Run focused test**

```powershell
npx vitest run <test-file>
```

Expected: PASS.

### Task 2: Sport Catalog Migration

**Files:**
- Create: `supabase/migrations/20260522000500_refresh_sport_activity_catalog.sql`

**Step 1: Create migration**

Add idempotent `INSERT ... ON CONFLICT (code) DO UPDATE` for these sport rows:

```text
sport.running          Running
sport.trail_run        Trail Run
sport.walking          Walking
sport.hiking           Hiking
sport.ride             Ride / Cycling
sport.mountain_bike    Mountain Bike
sport.swimming         Swimming
sport.workout          Workout
sport.hiit             HIIT
sport.weight_training  Weight Training
sport.crossfit         Crossfit
sport.yoga             Yoga
sport.pilates          Pilates
sport.soccer_futsal    Soccer / Futsal
sport.badminton        Badminton
sport.tennis           Tennis
sport.basketball       Basketball
sport.volleyball       Volleyball
sport.rowing           Rowing
sport.elliptical       Elliptical
sport.stair_stepper    Stair Stepper
sport.virtual_ride     Virtual Ride
sport.virtual_run      Virtual Run
sport.other            Other
```

Set all rows:
- `mode = 'sport'`
- `dimension_id = NULL`
- `points = 0`
- `requires_steps = false`
- `requires_calories = true`
- `is_active = true`
- `is_custom_input = true` only for `sport.other`, otherwise `false`
- `sort_order` increments by 10.

**Step 2: Preserve existing admin edits where safe**

Use `ON CONFLICT (code) DO UPDATE` to keep the catalog active and correctly configured. Accept that names/order can be refreshed by migration because this is a requested catalog reset.

### Task 3: Frontend Other Field

**Files:**
- Modify: `src/components/AddActivityBtn.tsx`

**Step 1: Add selected sport config**

Compute:

```ts
const selectedSportConfig = sportOptions.find((a) => a.name === activityType)
```

**Step 2: Render custom sport field**

When `mode === 'sport' && selectedSportConfig?.is_custom_input`, show required input:

```tsx
<input
  type="text"
  value={customName}
  onChange={(e) => setCustomName(e.target.value)}
  maxLength={200}
  placeholder="Contoh: Padel, Boxing, Dance Fitness"
/>
```

**Step 3: Submit custom name for sport Other**

Change request payload so `custom_name` is sent when:

```ts
(mode === 'daily' && selectedActivityConfig?.is_custom_input) ||
(mode === 'sport' && selectedSportConfig?.is_custom_input)
```

**Step 4: Update button disabled validation**

Disable sport save when selected sport requires custom input and `customName.trim()` is empty.

**Step 5: Reset custom field on sport change**

Clear `customName` when sport type changes, same as daily dimension/type behavior.

### Task 4: Verification

**Files:**
- Check: `docs/coding_standards.json`

**Step 1: Run focused tests**

```powershell
npx vitest run <activity-create-test-file>
```

Expected: PASS.

**Step 2: Run build**

```powershell
npm run build
```

Expected: PASS.

**Step 3: Self-review**

Check:
- No unrelated dirty files modified.
- UI still consumes `/api/activity-types`.
- Sport calories points remain 1:1.
- `Other` stores user-entered display name but keeps catalog type.

**Step 4: Commit**

```powershell
git add docs/plans/2026-05-22-sport-session-strava-catalog-design.md docs/plans/2026-05-22-sport-session-strava-catalog-implementation.md supabase/migrations/20260522000500_refresh_sport_activity_catalog.sql src/app/api/activities/create/route.ts src/components/AddActivityBtn.tsx <activity-create-test-file>
git commit -m "feat: expand sport session catalog"
```
