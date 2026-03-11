# Strava Sport Sync Design

**Goal:** Integrate Strava as an automatic `sport session` source that binds to an existing user account, respects global sync cooldowns, and awards physical activity points from Strava calories without affecting daily step logic.

## Product Rules

Strava is not a login method and not a daily-step source. Users authenticate with the app first, then connect Strava through the existing OAuth flow in `src/app/api/auth/login/route.ts` and `src/app/api/auth/callback/route.ts`. Once connected, Strava activities are imported only as `mode='sport'` records.

All Strava activities discovered during sync should be stored as history so admins can inspect disputes later. Automatic points are awarded only when the detailed Strava activity payload includes calories. When calories are present, `activity_points = calories`, `source = 'strava'`, and the points route into the `physical` dimension. When calories are absent, the record is still saved but `activity_points = 0`.

Records sourced from Strava are upserted by stable external identity, not inserted immutably. Metrics from Strava may change, so sync updates fields like `name`, `type`, `distance`, `moving_time`, `calories`, and `activity_points`. Admin moderation decisions remain authoritative: if a Strava-sourced record has been manually voided or otherwise reviewed, the sync process must not overwrite that review status.

## Sync Behavior

Sync runs automatically but not in real time. The system reads a global cooldown from the existing `settings` table, with default fallback `15` minutes. The sync route first checks `last_strava_sync_at` for the current profile. If the cooldown has not elapsed, the route returns cached database data and skips Strava API calls.

When a sync is allowed, the app fetches Strava activity summaries first, then fetches activity details only for records that are new or need completion data. This keeps request usage inside Strava read limits. Summary responses are used for discovery and base metadata; detail responses provide calories and richer sport metadata. The result is written back into the shared `activities` table so dashboard, leaderboard, and admin tooling continue reading one unified activity source.

## Data Model

The current `activities` table already distinguishes `daily` and `sport`. Strava sync should extend that model with external-source metadata so the app can safely upsert and reason about sync freshness. Minimum additions are:

- `external_source` or reuse `source='strava'`
- `external_id` for the Strava activity ID
- `sport_type` or equivalent Strava type field
- `has_calories` boolean
- `last_synced_at`
- profile-level `last_strava_sync_at`

`external_id` must be unique per source. If `source='strava'` and a matching `external_id` exists, the sync updates that row instead of creating a duplicate. `proof_url` remains `null` for Strava rows because these are verified by the integration itself.

## UX and Admin Expectations

Users should see Strava-imported sport sessions in the same history stream as manual sport sessions, but clearly marked as `source='strava'`. Sessions with calories show points immediately; sessions without calories remain visible with zero sport points. Admins can review the history and add compensating points through existing adjustment flows if needed.

The current admin `Sport Sessions` view can be extended later with a `source` filter, but phase 1 does not require manual review of Strava imports. Manual-photo sport sessions remain the only ones surfaced in the abuse-review tab by default.
