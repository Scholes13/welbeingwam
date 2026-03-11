# PR Draft: Architecture Remediation Port

**Suggested branch:** `codex/architecture-remediation`
**Suggested base:** `staging`

## Summary

This PR contains the architecture remediation work already completed in the isolated remediation branch:
- identity hardening around `profiles.auth_user_id`
- reward claim invariants and active-claim accounting
- regression tests and integrity audit script

## Important Context

This branch was built on an older `staging` baseline than current `origin/staging`.
It should be treated as a remediation reference branch, not merged blindly into the latest branch tip.

The current `origin/staging` auth/session layer has diverged toward cookie-based runtime flows, so the auth portions of this branch require selective porting instead of a direct merge.

## Why This Still Matters

- It contains the clearest expression of the intended data invariants.
- The new migrations are still useful on the current codebase:
  - [20260310000000_backfill_profiles_auth_user_id.sql](/I:/Project/Welbeing/.worktrees/architecture-remediation/supabase/migrations/20260310000000_backfill_profiles_auth_user_id.sql)
  - [20260310000001_reward_claim_invariants.sql](/I:/Project/Welbeing/.worktrees/architecture-remediation/supabase/migrations/20260310000001_reward_claim_invariants.sql)
- The audit script is still useful for rollout validation:
  - [check_architecture_integrity.ts](/I:/Project/Welbeing/.worktrees/architecture-remediation/scripts/check_architecture_integrity.ts)

## Review Focus

- confirm which parts should be ported onto latest `staging`
- verify migration order and rollout safety
- decide whether auth runtime should remain cookie-based or move to a canonical auth-user mapping
- separate "safe to port now" items from "needs auth architecture decision" items

## Verification Already Performed

- `npx vitest run`
- `npm run build`
- `npx tsx scripts/check_architecture_integrity.ts`

Key evidence from the remediation branch:
- targeted regression suite was made green before commit
- integrity audit still reported historical data drift, which is why rollout requires migrations plus data repair sequencing instead of blind merge
- commit reference on the remediation branch: `43698f4146ab496dd9f1e61f12ca63361ac83337`

## Known Limitation

Latest `origin/staging` has diverged enough in auth/session handling that this PR should be rebased or selectively ported before merge.

## Recommended Port Order

1. Port database migrations and integrity tooling first.
2. Port reward claim invariant handling onto the latest reward routes.
3. Revisit auth/session convergence in a dedicated follow-up PR with explicit login/session rollout planning.

## Explicit Non-Goal

This PR should not be merged directly into current `staging` without a selective port/rebase pass, because doing so would overwrite newer cookie/session flow assumptions with an older auth abstraction.
