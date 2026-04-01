# Welbeing Harness Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a strict Harness Engineering foundation for this repository so future agent work stays legible, reviewable, and consistent.

**Architecture:** Keep `AGENTS.md` minimal and treat it as a glossary and routing table into deeper source-of-truth docs. Encode repo boundaries, verification rules, execution tracking, and a lightweight enforceable audit directly in-repo so humans and agents share the same operating model.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase, Cloudflare OpenNext, Node.js scripts, GitHub Actions

---

## Chunk 1: Source-of-truth harness docs

### Task 1: Add the root agent table of contents

**Files:**
- Create: `AGENTS.md`

- [ ] Write a short root-level `AGENTS.md` that points to architecture, standards, execution plans, and agentic support docs.
- [ ] Keep `AGENTS.md` concise enough to avoid wasting model context before execution.
- [ ] Document the strict operating model and harness role mapping at a high level only.

### Task 2: Add the repository architecture document

**Files:**
- Create: `docs/architecture.md`

- [ ] Describe the product and deployment stack at a high level.
- [ ] Define ownership boundaries for backend, frontend, shared coordination, and review work.
- [ ] Capture repository-specific rules for Next.js App Router, Supabase, Cloudflare deployment, and verification expectations.

### Task 3: Add strict coding standards for agent work

**Files:**
- Create: `docs/coding_standards.json`

- [ ] Encode review requirements, role responsibilities, harness-to-subagent mapping, response contract rules, and verification rules in JSON.
- [ ] Keep the standards strict enough to block completion when review or verification is skipped.
- [ ] Tailor the rules to this repository instead of copying language that assumes Laravel/Inertia.

## Chunk 2: Execution and governance support

### Task 4: Seed execution tracking with known repo work

**Files:**
- Create: `docs/exec_plans.md`

- [ ] Add the operating rule, sub-agent roster, and harness assignment rules.
- [ ] Seed active and historical entries from the current repository state, including architecture remediation, Cloudflare CI/CD rollout, and Strava/profile sync work.
- [ ] Add a reusable task template for future agent entries.

### Task 5: Add supporting governance docs

**Files:**
- Create: `docs/agentic/README.md`
- Create: `docs/agentic/task-template.md`
- Create: `docs/agentic/future-enforcement-roadmap.md`

- [ ] Document how the harness docs relate to one another.
- [ ] Provide a reusable task template outside the execution log.
- [ ] Record the next enforcement steps so future hardening work has a home.

## Chunk 3: Enforceable baseline

### Task 6: Add a lightweight harness audit script

**Files:**
- Create: `scripts/check_harness_foundation.cjs`

- [ ] Add a script that verifies the required harness files exist.
- [ ] Check for a few critical sections and keys so the docs stay structurally intact.
- [ ] Exit non-zero with actionable messages when the harness foundation drifts.

### Task 7: Wire the audit into the local and CI verification path

**Files:**
- Modify: `package.json`

- [ ] Add a script entry to run the harness audit.
- [ ] Include the harness audit in `ci:verify` so the CI workflow enforces the new foundation.
- [ ] Avoid changing deploy behavior or adding external dependencies.

### Task 8: Replace the default README with agent-friendly onboarding

**Files:**
- Modify: `README.md`

- [ ] Replace the Next.js template README with project-specific onboarding.
- [ ] Link the new harness docs and the existing operations and plan docs.
- [ ] Keep the README high-level and readable for both humans and agents.
