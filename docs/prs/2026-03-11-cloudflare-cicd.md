# PR Draft: Cloudflare Branch CI/CD Setup

**Suggested branch:** `codex/cicd-setup`
**Suggested base:** `staging`

## Summary

This PR introduces a branch-based CI/CD path for the updated Cloudflare/OpenNext application:
- GitHub Actions CI for Next build + OpenNext build
- automatic Cloudflare deployment for `staging` and `main` only after CI succeeds
- a detailed PR template for operationally safe reviews
- branch flow documentation so future PRs follow one path consistently

## Why

The updated project already targets Cloudflare through `@opennextjs/cloudflare` and `wrangler`, but the repository had no checked-in GitHub workflow for:
- validating PRs before merge
- deploying `staging` separately from `main`
- standardizing PR review and rollout notes

This PR closes that gap with a minimal branch setup that matches the current deployment stack.

It also fixes the current worktree/multi-lockfile build issue by setting `turbopack.root` in Next config, which is required for reliable local and CI builds from branch worktrees.

## Files

- [package.json](/I:/Project/Welbeing/.worktrees/cicd-setup/package.json)
- [ci.yml](/I:/Project/Welbeing/.worktrees/cicd-setup/.github/workflows/ci.yml)
- [deploy-cloudflare.yml](/I:/Project/Welbeing/.worktrees/cicd-setup/.github/workflows/deploy-cloudflare.yml)
- [pull_request_template.md](/I:/Project/Welbeing/.worktrees/cicd-setup/.github/pull_request_template.md)
- [2026-03-11-branch-cicd-flow.md](/I:/Project/Welbeing/.worktrees/cicd-setup/docs/operations/2026-03-11-branch-cicd-flow.md)

## Verification

- `npm run build`
- `npm run pages:build`
- `npm run ci:verify`

## Deferred Debt

- Repository-wide ESLint currently fails on the latest `staging` baseline with a large volume of pre-existing `no-explicit-any`, `react/no-unescaped-entities`, and hook-effect violations.
- This PR does not attempt to fix that backlog because it is independent from bootstrapping the Cloudflare CI/CD path.
- Lint should be added back as a required CI gate in a dedicated cleanup PR once the baseline is reduced to a tractable scope.

## Required GitHub Setup

Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `OPENROUTER_API_KEY_1`

Variables:
- `STAGING_PUBLIC_URL`
- `PRODUCTION_PUBLIC_URL`
- `CLOUDFLARE_STAGING_WORKER_NAME`
- `CLOUDFLARE_PRODUCTION_WORKER_NAME`

## Rollout

1. Add secrets and vars in GitHub settings.
2. Merge into `staging`.
3. Confirm the deploy workflow runs from the successful `CI` workflow and lands on the staging worker.
4. Promote to `main` after staging verification.
