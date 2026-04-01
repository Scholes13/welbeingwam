# Future Enforcement Roadmap

This roadmap captures the next layers of Harness Engineering hardening for the Welbeing repository.

## Near-term
- Add a real `scripts/check_architecture_integrity.ts` implementation and wire it into targeted rollout workflows.
- Add a docs check that validates `docs/exec_plans.md` entries follow the required template.
- Add a review checklist for auth/session changes, service-role usage, and response contract changes.
- Add project-specific smoke-test guidance for dashboard, profile, rewards, and admin surfaces.

## Mid-term
- Add architectural drift checks for:
  - user-scoped reads that still depend on service-role access,
  - page loads coupled to expensive sync endpoints,
  - mutation flows that should move behind a single database or RPC boundary.
- Add a recurring cleanup routine for:
  - duplicate auth/profile resolution logic,
  - route handlers that silently diverge in response shape,
  - stale docs that reference unported scripts or migrations.
- Add a stronger README and onboarding index for important domain areas.

## Long-term
- Add CI checks for targeted architectural invariants instead of relying only on human review.
- Introduce recurring background maintenance tasks that open small cleanup PRs for drift and standards violations.
- Add richer automation around execution-plan hygiene, architecture decisions, and release smoke checks.

## Guardrail Principle
Favor guardrails that enforce repository legibility and invariants over rules that micromanage implementation details. The goal is to keep future agent work consistent without making the repo harder to evolve.
