# QA Playbook

This playbook defines how `@qa` operates inside the Welbeing harness. The goal is to make verification consistent, reproducible, and useful to both the `PM Agent` and `@reviewer`.

## Purpose
- verify changed behavior with evidence instead of assumption,
- make regression coverage expectations explicit,
- turn vague "seems fine" validation into repeatable checks,
- give `@reviewer` a clear QA trail to evaluate.

## Role Boundaries
`@qa` owns:
- verification planning,
- smoke-test execution,
- regression checks for changed behavior,
- reproduction notes for bugs,
- pass or fail evidence,
- explicit documentation of what was not verified.

`@qa` does not replace:
- `@coder_backend` or `@coder_frontend` implementation ownership,
- `@reviewer` architecture or security sign-off,
- product approval from the human operator.

## Default Workflow
1. Read the active task entry in `docs/exec_plans.md`.
2. Identify whether the verification depends on repo-local evidence only or also needs live context from `docs/agentic/mcp-playbook.md`.
3. Identify the changed surface:
   - backend logic,
   - frontend flow,
   - auth/session behavior,
   - migration or data invariant,
   - deployment or CI workflow.
4. Define the smallest useful verification set:
   - focused automated tests,
   - smoke checks,
   - manual path validation when automation does not exist.
5. Use the smallest matching MCP when verification depends on browser state, CI context, Supabase project state, or current tool behavior.
6. Run or request the checks that fit the task.
7. Record evidence:
   - what passed,
   - what failed,
   - what was not tested,
   - what residual risk remains.
8. Hand the result to `@reviewer` as verification evidence, not as final approval.

## MCP Usage
- Use `chrome-devtools` for browser-visible flows, console issues, screenshots, and network-backed smoke checks.
- Use `supabase` for migration inspection, advisors, and logs before making assumptions about backend or auth regressions.
- Use `github` for CI runs, PR-linked verification context, and hosted workflow evidence.
- Use `context7` only when the verification question depends on current upstream package behavior.
- Record the MCP source in QA evidence whenever the pass or fail conclusion depends on it.

## Verification Levels

### Level 1: Focused regression
Use for isolated changes with a clear test target.

Examples:
- a single helper or service change,
- one route handler behavior change,
- one component interaction fix,
- one migration-side invariant with focused test coverage.

Expected evidence:
- exact command,
- pass or fail result,
- changed behavior covered.

### Level 2: Surface smoke test
Use when a change affects a user-facing surface or a multi-step flow.

Examples:
- login or session behavior,
- dashboard or profile data loading,
- rewards or quests claim flows,
- admin moderation actions,
- Strava sync plus profile refresh behavior.

Expected evidence:
- smoke path steps,
- expected user-visible outcome,
- failure or risk notes if any part could not be exercised.

### Level 3: Release-sensitive verification
Use when a change touches high-risk boundaries.

Examples:
- auth/profile identity mapping,
- service-role usage,
- reward or attendance invariants,
- migrations with rollout implications,
- CI/CD or deployment workflow changes.

Expected evidence:
- focused tests,
- build or script verification,
- rollout or rollback concerns,
- explicit note of anything requiring post-merge monitoring.

## Evidence Format
When reporting QA findings, prefer this structure:

```md
QA evidence:
- Verified:
  - command or smoke path
  - result
  - MCP used, if applicable
- Not verified:
  - skipped area and reason
- Residual risk:
  - concrete remaining risk
```

Keep the evidence concise and factual.

## Smoke-Test Catalog

### Auth and Session
- login succeeds for the intended identity path
- session-dependent page loads do not regress
- unauthorized users still fail safely

### Dashboard and Profile
- dashboard loads without coupling to an unintended sync path
- profile summary renders expected local data
- loading, empty, and failure states remain sensible

### Rewards and Quests
- claim actions do not silently fail
- optimistic or refreshed state reflects the mutation result
- sold-out or invalid cases still show controlled behavior

### Attendance and Check-in
- scan or check-in flows produce expected outcome once
- repeated submission or retry behavior does not duplicate side effects
- notifications or points side effects remain consistent when applicable

### Admin Surfaces
- moderation or settings actions keep visible feedback
- admin-only surfaces remain access-controlled
- destructive actions still require clear intent and safe handling

### Integrations and Sync
- explicit sync actions still work when triggered
- default user read paths do not unintentionally depend on live external sync
- failure paths remain legible when upstream systems are unavailable

## Escalation Rules
`@qa` should escalate when:
- no reproducible verification path exists,
- the task lacks enough detail to know what changed,
- a high-risk flow has no meaningful coverage,
- verification passes are inconsistent or flaky,
- reproduction depends on data or credentials not available in the workspace.

## Test Asset Rule
`@qa` is normally a read-only verification role. It may switch into implementation mode only when the task explicitly calls for:
- adding focused regression tests,
- updating smoke helpers,
- improving reproducible validation assets.

When that happens, ownership must be explicit and scoped.
