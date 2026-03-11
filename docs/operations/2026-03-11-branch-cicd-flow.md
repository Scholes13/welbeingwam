# Branch CI/CD Flow

**Goal:** Establish a clear branch-to-environment deployment path for the updated Cloudflare/OpenNext project.

## Branch Strategy

- `staging`
  Used as the integration branch.
  Every push runs CI and deploys a staging worker.

- `main`
  Used as the production branch.
  Every push runs CI and deploys the production worker.

- `codex/*` and feature branches
  Used for implementation work.
  Open PRs into `staging`.

## CI Workflow

File: [ci.yml](/I:/Project/Welbeing/.worktrees/cicd-setup/.github/workflows/ci.yml)

Runs on:
- PRs into `staging`
- PRs into `main`
- direct pushes to `staging`
- direct pushes to `main`

Checks:
- `npm ci`
- `npm run ci:verify` (`ci:clean` + OpenNext bundle build)

The CI job uses placeholder values for build-time envs so the app can be validated without exposing secrets.
Repository-wide ESLint still has substantial legacy debt on the current `staging` baseline, so lint is documented as follow-up work rather than a merge gate for this bootstrap PR.
Local Windows runs of OpenNext can be flaky even after a passing build; the authoritative verification target is Node 20 on Linux, which matches the GitHub Actions runner.

## CD Workflow

File: [deploy-cloudflare.yml](/I:/Project/Welbeing/.worktrees/cicd-setup/.github/workflows/deploy-cloudflare.yml)

Deploy rules:
- successful `CI` run for `staging` -> deploy Cloudflare worker `${CLOUDFLARE_STAGING_WORKER_NAME:-wam25-staging}`
- successful `CI` run for `main` -> deploy Cloudflare worker `${CLOUDFLARE_PRODUCTION_WORKER_NAME:-wam25}`

## Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `OPENROUTER_API_KEY_1`

## Required GitHub Variables

- `STAGING_PUBLIC_URL`
- `PRODUCTION_PUBLIC_URL`
- `CLOUDFLARE_STAGING_WORKER_NAME` (optional, defaults to `wam25-staging`)
- `CLOUDFLARE_PRODUCTION_WORKER_NAME` (optional, defaults to `wam25`)

## Recommended Rollout

1. Add the secrets and variables in GitHub repository settings.
2. Push this branch and open a PR into `staging`.
3. Confirm CI passes.
4. Merge into `staging` and verify the deploy workflow fires from the successful `CI` run for that merge commit.
5. Promote from `staging` to `main` once staging checks are stable.

## Verification Notes

- Preferred local verification:
  - `npx -y -p node@20 -p npm@10 cmd /c "npm run ci:verify"` on Windows
  - or run `npm ci && npm run ci:verify` inside Linux/WSL
- `npm run lint` is currently expected to fail on the shared baseline and should not block this bootstrap PR.

## Risks

Primary risk:
- GitHub environments or Cloudflare credentials may be missing, causing deploy workflow failures immediately after merge.

Secondary risk:
- reviewers may assume lint is enforced even though this flow intentionally gates build and OpenNext bundle generation only.

Mitigation:
- configure repository secrets and variables before merge
- call out the deferred lint gate explicitly in the PR body
- follow with a dedicated lint-hardening PR once the current backlog is reduced
