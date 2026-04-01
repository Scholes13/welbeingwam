# Welbeing

Welbeing is a Next.js and Supabase application for event engagement, wellness participation, and reward-driven user journeys. The repository includes participant-facing experiences such as quests, rewards, map check-ins, surveys, profiles, and notifications, plus admin flows and integrations like Strava sync.

## Stack
- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- OpenNext on Cloudflare Workers
- Vitest for focused testing

## Getting Started

1. Install dependencies:

```bash
npm ci
```

2. Configure environment variables:

```bash
copy .env.example .env.local
```

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run build
npm test
npm run verify:harness
npm run ci:verify
```

## Repository Guide
- Agent entry point: `AGENTS.md`
- Architecture and boundaries: `docs/architecture.md`
- Strict standards and review gates: `docs/coding_standards.json`
- Execution tracking and known tech debt: `docs/exec_plans.md`
- Agentic support docs: `docs/agentic/README.md`
- Existing operations docs: `docs/operations/`
- Existing design and implementation plans: `docs/plans/`
- PR and rollout notes: `docs/prs/`

## Deployment

CI and deployment expectations are documented in:
- `docs/operations/2026-03-11-branch-cicd-flow.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-cloudflare.yml`

The current branch strategy is:
- `codex/*` and feature branches -> PR into `staging`
- `staging` -> integration and staging deploys
- `main` -> production deploys

## Harness Engineering Foundation

This repository now uses a strict Harness Engineering foundation:
- `AGENTS.md` stays intentionally small and acts as a table of contents.
- Durable operating rules live in `docs/`.
- Multi-file or multi-layer work should be tracked in `docs/exec_plans.md`.
- The baseline harness structure is enforced by `npm run verify:harness` and is part of `npm run ci:verify`.

## Current Focus Areas
- continue hardening auth and profile identity handling
- keep expensive sync flows off default user read paths
- preserve reward, attendance, and notification invariants under retry and concurrency
- improve repo legibility so future agent work scales cleanly
