# Sport Session Physical Points Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two activity modes so daily activity continues to award step points while sport sessions award physical-dimension activity points from calories with photo proof and admin void controls.

**Architecture:** Extend the existing `activities` table and shared `/api/strava/sync` activity feed so the product can distinguish `daily` and `sport` records without introducing a second data source. Keep leaderboard math centralized in `src/lib/gamification.ts` and `src/lib/points.ts`, and reuse the existing `quest-proofs` bucket for sport proof uploads to minimize new infrastructure.

**Tech Stack:** Next.js App Router, React, Supabase, Vitest, TypeScript

---

### Task 1: Add tests for new point model

**Files:**
- Modify: `src/lib/points.test.ts`
- Modify: `src/lib/gamification.test.ts`

**Steps:**
1. Write failing tests for `calories -> activity points` conversion and total earned points including step points plus activity points.
2. Write failing tests for leaderboard entries tracking `sport_points` separately from `total_steps`.
3. Write failing tests for combined activities preserving sport metadata and excluding voided sport sessions from totals.
4. Run targeted Vitest commands and confirm failures are caused by missing sport-point support.

### Task 2: Extend persistence and API shape for sport sessions

**Files:**
- Create: `supabase/migrations/20260311000000_add_sport_session_fields.sql`
- Modify: `src/app/api/activities/create/route.ts`
- Modify: `src/app/api/strava/sync/route.ts`

**Steps:**
1. Add migration columns for `mode`, `calories`, `activity_points`, `proof_url`, `review_status`, `review_reason`, `source`, and `dimension_id` on `activities`.
2. Update create-activity API validation so `daily` requires `steps`, while `sport` requires `activity_type`, `calories`, and `proof_url`.
3. Ensure sport submissions auto-approve and write `activity_points = calories`, `review_status = approved`, and physical `dimension_id`.
4. Update `/api/strava/sync` response mapping so activities include the new fields and total points include sport points.

### Task 3: Update point aggregation and leaderboard math

**Files:**
- Modify: `src/lib/points.ts`
- Modify: `src/lib/gamification.ts`
- Modify: `src/app/api/leaderboard/route.ts`
- Modify: `src/hooks/use-swr-hooks.ts`

**Steps:**
1. Add helpers for activity-point conversion and total-earned calculation including activity points.
2. Update leaderboard aggregation to compute `total_steps`, `step_points`, `sport_points`, `overall_points`, and physical dimension points without double-counting sport sessions as steps.
3. Filter leaderboard activity rows so rejected/voided sport sessions do not contribute.
4. Expose the new breakdown fields through the shared profile/leaderboard payloads.

### Task 4: Update dashboard input and presentation

**Files:**
- Modify: `src/components/AddActivityBtn.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Steps:**
1. Replace the single manual activity modal with a mode picker for `Daily Activity` and `Sport Session`.
2. Reuse the existing Supabase browser client upload flow to send sport proof images to `quest-proofs`.
3. Submit daily and sport payloads to the updated create API with the right required fields per mode.
4. Update dashboard summary cards and recent activities list to show step points, sport points, total physical points, and sport proof/status metadata.

### Task 5: Add admin void flow for sport sessions

**Files:**
- Modify: `src/app/dashboard/admin/components/AdminTabs.tsx`
- Modify: `src/app/dashboard/admin/components/AdminSidebar.tsx`
- Modify: `src/app/dashboard/admin/components/adminLayout.ts`
- Modify: `src/app/dashboard/admin/page.tsx`
- Modify: `src/app/dashboard/admin/types.ts`
- Create: `src/app/api/admin/sport-sessions/route.ts`
- Create: `src/app/api/admin/sport-sessions/void/route.ts`

**Steps:**
1. Add a new admin tab for sport sessions with a focused list of recent manual sport submissions.
2. Build list and void actions against dedicated admin APIs instead of overloading existing activity admin routes.
3. Show proof image, calories, activity type, user, submission time, and current review status.
4. Void a session by updating `review_status` and `review_reason`, then ensure downstream totals stop counting that record.

### Task 6: Verify end-to-end behavior

**Files:**
- Test: `src/lib/points.test.ts`
- Test: `src/lib/gamification.test.ts`

**Steps:**
1. Run targeted tests for points and gamification helpers.
2. Run lint or narrow build verification on touched files if feasible.
3. Manually inspect the final diff for unintended changes in the worktree.
