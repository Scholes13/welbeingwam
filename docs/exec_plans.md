# Execution Plans

## Operating Rule
- The Product Owner defines goals and priorities.
- The main agent acts as `PM Agent`.
- The PM updates this file when substantial work starts, changes scope, completes, or reveals meaningful tech debt.
- Implementation must be reviewed against `docs/coding_standards.json` before being presented as complete.

## Sub-Agent Roster
- `@coder_backend`: route handlers, auth/session work, Supabase integration, migrations, scripts, and server-side domain logic.
- `@coder_frontend`: App Router UI, components, hooks, context, and client-side interaction flows.
- `@qa`: verification execution, smoke checks, regression validation, and reproducible evidence gathering.
- `@reviewer`: standards review, security checks, architecture drift checks, and verification review.

## Harness Assignment Rules
- Conceptual roles are mapped onto harness sub-agent types when work starts; they are not permanently connected agents.
- Default mapping:
  - `@coder_backend` => `worker`
  - `@coder_frontend` => `worker`
  - `@qa` => `explorer`
  - escalated `@qa` for test-helper implementation => `worker`
  - `@reviewer` => `explorer`
  - escalated `@reviewer` => `default`
  - repository discovery or impact analysis => `explorer`
- The `PM Agent` should spawn agents per task, define ownership clearly, and close them after completion.
- Use parallel workers only when their write scopes are meaningfully separate.

## Active Tasks

### 2026-04-01 - Dashboard vs leaderboard points mismatch
- Status: completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@qa`, `@reviewer`
- Scope:
  - trace why dashboard total points and leaderboard overall points diverge for the same user,
  - align leaderboard activity aggregation with the full `activities` dataset so sport-session points are not silently dropped,
  - add focused regression coverage for the activity-fetch path that feeds leaderboard aggregation.
- Risks:
  - the leaderboard currently depends on a table that has grown past Supabase's default page size, so silent truncation can affect more than one participant,
  - changing the fetch path must preserve compatibility with the existing `activities` schema while avoiding duplicate or missing rows.
- Verification:
  - focused Vitest coverage for `src/app/api/leaderboard/activities.test.ts`
  - focused Vitest coverage for `src/lib/gamification.test.ts`
  - targeted live check of `/api/leaderboard` versus `/api/strava/sync` for the affected user after the fix
- Notes:
  - live evidence on 2026-04-01 showed dashboard formula `7005 + 649 + 320 + 474 = 8448` for profile `Pramuji`, while `/api/leaderboard` returned `7799` because sport-session rows were missing from the fetched `activities` set.
  - root cause: `src/app/api/leaderboard/activities.ts` relied on a single `select('*')` call against `public.activities`, which silently truncated at Supabase's default 1000-row page size once the table reached 1126 rows.
  - fix: the leaderboard activity fetch now pages through `activities` in 1000-row batches, and focused regression coverage was added so later activity rows continue contributing to leaderboard totals.
  - post-fix live check on 2026-04-01: `/api/leaderboard` returned `Pramuji` with `sport_points=649` and `overall_points=8448`, matching dashboard math.

### 2026-04-01 - Auth canonicalization and duplicate-email cleanup
- Status: completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@qa`, `@reviewer`
- Scope:
  - converge all username-based login paths onto canonical `@werkudara.com` auth identities,
  - preserve existing `public.profiles.id` records and all downstream history tables,
  - backfill `profiles.auth_user_id`, reset auth credentials, revoke stale sessions, and remove `@wam.local` duplicates after verification.
- Risks:
  - deleting legacy auth users too early could strand profiles if canonical links are incomplete,
  - runtime code still contains mixed-domain login behavior and username fallback resolution that must be updated in lockstep with data cleanup,
  - forced password reset and session revocation are intentional but operationally disruptive.
- Verification:
  - focused auth/login Vitest coverage
  - `npm run build`
  - targeted Supabase integrity queries for canonical auth mappings and duplicate legacy identities
- Notes:
  - user-approved target state: case-insensitive username login, canonical auth email format `lower(username)@werkudara.com`, reset all auth passwords to `werkudara88`, and force all users to log in again,
  - business history must remain attached to existing `public.profiles.id` values; cleanup should modify auth linkage instead of moving transactional rows.
  - non-destructive phase completed on 2026-04-01: `profiles.auth_user_id` backfilled for all 59 profiles, canonical auth passwords reset, `public.profiles.password` scrubbed to `NULL`, runtime login paths standardized to canonical `@werkudara.com`, and live `auth.sessions` returned zero rows after the reset.
  - destructive phase completed on 2026-04-01 after explicit operator approval: 59 legacy `@wam.local` auth users were deleted, live duplicate auth identities dropped to 0, and the canonical schema guard indexes were applied to the remote project through Supabase CLI migration history.
  - residual follow-up: the integrity script currently still hard-fails when `SUPABASE_MANAGEMENT_TOKEN` is absent even if live SQL proves the guard indexes exist, and live browser smoke was not executed in this session.

### 2026-04-01 - MCP-first harness documentation alignment
- Status: completed
- Owner: PM Agent
- Delegates: `@qa`, `@reviewer`
- Scope:
  - update the harness docs so `PM Agent` routes external context through configured MCP servers,
  - clarify how sub-agents should be handed a preferred MCP surface when live context matters,
  - align QA and reviewer playbooks with the same MCP-first operating model.
- Risks:
  - duplicated guidance across docs could drift if the wording is too repetitive,
  - weak PM guidance would leave MCP usage as optional background knowledge instead of an execution rule.
- Verification:
  - `npm run verify:harness`
- Notes:
  - this task should keep `AGENTS.md` small and place durable operating detail in `docs/agentic/`,
  - the primary source of detailed MCP behavior should remain `docs/agentic/mcp-playbook.md`,
  - `npm run verify:harness` passed after the documentation updates landed.

### 2026-04-01 - Harness engineering foundation scaffold
- Status: completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@coder_frontend`, `@qa`, `@reviewer`
- Scope:
  - establish a strict Harness Engineering foundation for future agent work,
  - keep `AGENTS.md` minimal and move durable detail into architecture, standards, and execution docs,
  - add a lightweight enforceable audit and wire it into CI verification.
- Risks:
  - over-prescriptive rules can become stale if they are not updated alongside the codebase,
  - weak enforcement would turn the harness into passive documentation instead of an active operating system.
- Verification:
  - `npm run verify:harness`
- Notes:
  - the foundation is intentionally modeled after the stronger repository harness used in `I:\Project\Numbering`, adapted to this Next.js plus Supabase stack,
  - the README is being converted from the default Next.js template into project-specific onboarding,
  - future hardening work should add deeper architecture audits and recurring cleanup loops instead of overloading `AGENTS.md`,
  - role-specific playbooks and workspace MCP baseline were added after the initial scaffold so backend, frontend, QA, and reviewer roles can operate with clearer guidance.

### 2026-03-11 - Architecture remediation selective port and rollout planning
- Status: planned
- Owner: PM Agent
- Delegates: `@coder_backend`, `@coder_frontend`, `@qa`, `@reviewer`
- Scope:
  - port the safe parts of the remediation work onto the current branch,
  - prioritize canonical identity handling, reward invariants, and architecture integrity tooling,
  - separate safe migrations and audit tooling from auth runtime decisions that need deliberate rollout planning.
- Risks:
  - the remediation branch was built against an older baseline and should not be merged blindly,
  - auth and session handling has diverged, so direct porting may overwrite newer behavior.
- Verification:
  - `npx vitest run`
  - `npm run build`
  - `npx tsx scripts/check_architecture_integrity.ts`
- Notes:
  - source docs:
    - `docs/plans/2026-03-10-architecture-remediation-plan.md`
    - `docs/prs/2026-03-11-architecture-remediation-port.md`
  - the integrity script referenced in the remediation docs does not yet exist on the current branch and should be treated as unfinished work.

### 2026-03-11 - Cloudflare CI/CD branch flow baseline
- Status: completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@qa`, `@reviewer`
- Scope:
  - establish branch-aware CI and deployment flow for `staging` and `main`,
  - verify OpenNext bundle generation in CI,
  - deploy successful builds to the appropriate Cloudflare worker environment.
- Risks:
  - secrets and variables may still be missing in GitHub repository settings,
  - local Windows verification can differ from Linux CI behavior.
- Verification:
  - `npm run ci:verify`
- Notes:
  - source docs:
    - `docs/operations/2026-03-11-branch-cicd-flow.md`
    - `docs/prs/2026-03-11-cloudflare-cicd.md`
  - workflows currently live in `.github/workflows/ci.yml` and `.github/workflows/deploy-cloudflare.yml`.

### 2026-03-11 - Strava sync and profile read-path stabilization
- Status: in_progress
- Owner: PM Agent
- Delegates: `@coder_backend`, `@coder_frontend`, `@qa`, `@reviewer`
- Scope:
  - keep Strava synchronization explicit instead of letting it dominate default read paths,
  - preserve moderation fields when Strava activities are re-synced,
  - continue separating sync behavior from local dashboard and profile reads.
- Risks:
  - user-facing pages may still depend too heavily on sync freshness or expensive revalidation,
  - admin review state can drift if re-sync logic overwrites moderated fields.
- Verification:
  - `npm run build`
  - focused Vitest coverage for `src/lib/strava/sync.test.ts` and related UI consumers
- Notes:
  - source docs:
    - `docs/plans/2026-03-11-strava-sport-sync-design.md`
    - `docs/plans/2026-03-11-strava-sport-sync-implementation.md`
  - current repository evidence shows Strava sync logic already extracted under `src/lib/strava/sync.ts`, but broader read-path cleanup remains an ongoing architecture concern.

## Completed Tasks
- 2026-04-01: Harness docs were aligned to a MCP-first operating model for `PM Agent`, `@qa`, and `@reviewer`.
- 2026-03-11: OpenNext plus Cloudflare CI/CD workflow scaffold landed in repository docs and workflow files.
- 2026-03-11: Architecture remediation work was documented and partially preserved through an isolated remediation branch for selective porting.
- 2026-03-11: Strava sync domain logic was extracted into a dedicated service layer and covered by focused tests.
- 2026-04-01: Harness Engineering scaffold established with architecture, standards, execution tracking, and an enforceable baseline audit.

## Known Tech Debt
- `README.md` historically lagged behind the real project shape and is only now being aligned with the current repository.
- Architecture remediation documentation exists, but some referenced tooling and migrations are not yet ported onto the active branch.
- The repository still lacks deeper automated checks for architectural drift, auth invariants, and service-role boundary creep.
- Existing docs in `docs/plans/` and summary files predate the new harness model and will need gradual consolidation rather than one large rewrite.

## Task Template
Use this shape for future updates:

### YYYY-MM-DD - Task Title
- Status: planned | in_progress | review | blocked | completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@coder_frontend`, `@qa`, `@reviewer`
- Scope:
- Risks:
- Verification:
- Notes:
