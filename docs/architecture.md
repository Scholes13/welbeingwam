# Architecture

## Purpose
This repository uses a Harness Engineering structure so product direction can stay human-led while implementation remains agent-friendly, reviewable, and consistent across patches.

## Product and Stack
- Product: Welbeing event and engagement platform with quests, rewards, profile progress, Strava sync, attendance, map/check-in flows, and admin operations
- Frontend runtime: Next.js 16 App Router with React 19 and TypeScript
- Styling and UI: Tailwind CSS, custom components, SWR, framer-motion
- Backend surface: Next.js route handlers under `src/app/api`, server utilities under `src/lib` and `src/utils`
- Data and auth: Supabase Auth, Postgres, Storage, SQL migrations under `supabase/migrations`
- Deployment: OpenNext on Cloudflare Workers
- Verification: Vitest, TypeScript compilation through Next.js build, lightweight Node scripts, GitHub Actions CI

## Team Structure
- `PM Agent`
  - reads requests,
  - records meaningful work in `docs/exec_plans.md`,
  - breaks work into owned lanes,
  - routes external platform, documentation, repository-hosted, browser, and project-state lookups through the matching MCP when one exists,
  - includes MCP expectations in sub-agent dispatches when a task depends on external or live context,
  - and does not finalize implementation until standards and verification pass.
- `@coder_backend`
  - owns route handlers, auth/session behavior, server-side domain logic, Supabase access, migrations, scripts, and backend-focused tests.
- `@coder_frontend`
  - owns App Router pages, components, hooks, context providers, client-side interaction flows, and frontend-focused tests.
- `@qa`
  - owns verification execution, smoke-test design, regression passes, reproducible bug notes, and validation evidence.
  - follows `docs/agentic/qa-playbook.md` for verification depth and reporting shape.
- `@reviewer`
  - validates work against `docs/coding_standards.json`,
  - checks architecture drift, security-sensitive changes, standards compliance, and contract mismatches.
  - follows `docs/agentic/reviewer-playbook.md` for review depth and reporting shape.

## Harness Agent Mapping
- The harness exposes reusable sub-agent types, not permanent named teammates.
- Role names such as `@coder_backend`, `@coder_frontend`, and `@reviewer` are operating roles assigned by the `PM Agent`.
- MCP usage guidance lives in `docs/agentic/mcp-playbook.md`.
- `PM Agent` is responsible for turning role names into both the correct sub-agent type and the smallest relevant MCP surface for the task.
- Concrete mapping:
  - `@coder_backend` => `worker`
  - `@coder_frontend` => `worker`
  - `@qa` => `explorer` for read-only verification and evidence gathering
  - `@qa` => `worker` when the task is to add or update dedicated tests, smoke helpers, or reproducible validation assets
  - `@reviewer` => `explorer` for read-only review and standards validation
  - `@reviewer` => `default` when review requires broader reasoning or adjudication
  - repository discovery, tracing, and impact analysis => `explorer`
- Sub-agents are spawned on demand, scoped to a task, and closed after the task is complete.

## Workflow
1. A product or maintenance request arrives.
2. `PM Agent` checks the current repo state and records meaningful work in `docs/exec_plans.md`.
3. `PM Agent` identifies whether the task needs in-repo evidence only or also needs live external context and then chooses the relevant MCP surface from `docs/agentic/mcp-playbook.md`.
4. `PM Agent` splits the work by ownership boundary and includes MCP expectations in the handoff when the task needs live context.
5. `@coder_backend` and `@coder_frontend` implement only inside their assigned boundaries unless the plan explicitly coordinates a contract change.
6. `@qa` validates behavior, smoke paths, and regression coverage expectations.
7. `@reviewer` checks the result against `docs/coding_standards.json`.
8. Work is only presented as complete after required verification passes and remaining risk is stated clearly.

## Directory Boundaries

### Backend-owned areas
- `src/app/api/`
- `src/lib/` except strictly presentation-only helpers that are local to a UI surface
- `src/utils/`
- `src/middleware.ts`
- `scripts/`
- `supabase/`
- backend-leaning tests under `src/**/*.test.ts` when they validate server logic

### Frontend-owned areas
- `src/app/` page and layout UI outside `src/app/api/`
- `src/components/`
- `src/hooks/`
- `src/context/`
- `public/`
- frontend-leaning tests near UI modules

### Shared coordination areas
- `docs/`
- `AGENTS.md`
- `README.md`
- API contracts, auth/session expectations, shared domain types, and serialization boundaries between route handlers and UI consumers

## Repository-specific Rules
- Prefer repository-local architecture truth over conversational memory.
- Keep `AGENTS.md` short; move durable detail into `docs/`.
- Preserve the current Next.js App Router structure instead of inventing parallel routing abstractions.
- Treat Supabase migrations and route-handler behavior as backend-owned changes even when UI work depends on them.
- Prefer explicit server helpers for auth/profile resolution instead of duplicating ad hoc identity logic in routes.
- Prefer local aggregate read APIs for dashboards and profile surfaces over coupling page loads to third-party sync behavior.
- Do not add new dependencies or top-level directories without approval.
- Do not change deployment branch flow casually; current branch strategy and Cloudflare deployment expectations are documented under `docs/operations/`.

## Boundaries and Handoffs
- Backend changes that alter response shape, auth/session rules, or mutation behavior must be documented as contract changes in `docs/exec_plans.md`.
- Frontend changes should consume existing contracts whenever possible instead of inventing alternate fetch paths.
- Reviewer should block completion if a task crosses boundaries without a coordinated plan.
- QA should call out missing reproduction steps, missing smoke coverage, or unclear verification evidence before completion.
- `PM Agent` should prefer exploration before coding when the task requires discovery, tracing, or architecture impact analysis.
- `PM Agent` should prefer repository docs for local truth first, then the smallest matching MCP for live context, and only then fall back to ad hoc guessing or wider browsing.
- Parallel implementation lanes are appropriate only when file ownership is disjoint enough to avoid merge churn.

## Completion Criteria
Work is only complete when:
- it matches the current execution plan,
- standards review passes,
- required verification passes,
- any skipped verification is stated explicitly,
- and the change does not quietly erode auth, data, or deployment boundaries.

## Current Architecture Pressure Points
- Auth and profile identity consistency still need continued hardening around a canonical mapping.
- Some user-facing reads have historically been too close to live sync or service-role flows.
- Reward, attendance, and notification invariants need continued preference for database-enforced or single-boundary mutation paths.
- Repository documentation is improving but still incomplete, so future work should continue encoding decisions in-repo instead of leaving them in chat history.
