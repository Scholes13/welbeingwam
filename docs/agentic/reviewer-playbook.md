# Reviewer Playbook

This playbook defines how `@reviewer` operates inside the Welbeing harness. The reviewer is the final quality gate for standards, architecture, and risk, but is not a replacement for implementation ownership or QA evidence.

## Purpose
- protect architectural coherence as the repository scales,
- block silent drift in auth, data, contract, and deployment boundaries,
- ensure verification evidence is present and credible,
- make review outcomes consistent across patches.

## Role Boundaries
`@reviewer` owns:
- standards review against `docs/coding_standards.json`,
- architecture boundary review,
- security-sensitive review,
- contract review across backend and frontend boundaries,
- assessment of QA evidence quality,
- final review notes and residual risk callouts.

`@reviewer` does not replace:
- `PM Agent` planning and orchestration,
- `@coder_backend` and `@coder_frontend` implementation ownership,
- `@qa` verification execution,
- human product judgment.

## Default Workflow
1. Read the active task entry in `docs/exec_plans.md`.
2. Determine whether the review needs repo-local evidence only or also needs live context from `docs/agentic/mcp-playbook.md`.
3. Read the relevant changed files and map the ownership boundaries involved.
4. Check whether the implementation follows `docs/coding_standards.json`.
5. Review QA evidence:
   - what was verified,
   - what was skipped,
   - whether the evidence matches the change risk.
6. Use the smallest matching MCP when the review depends on current hosted context, browser evidence, migration state, or external documentation.
7. Review for the key failure classes:
   - architecture drift,
   - auth or permission drift,
   - contract drift,
   - missing or weak error handling,
   - insufficient verification,
   - hidden rollout risk.
8. Return one of three outcomes:
   - approved,
   - approved with residual risk,
   - changes required.

## MCP Usage
- Use `github` when review conclusions depend on PR discussion, workflow status, or hosted repository context not present in the local checkout.
- Use `supabase` when reviewing migration impact, schema drift, advisors, or logs.
- Use `chrome-devtools` when validating browser-visible regressions or checking QA screenshots and console evidence.
- Use `context7` or `openaiDeveloperDocs` when standards questions depend on current external documentation.
- Treat MCP-backed evidence as preferable to memory when reviewing live or version-sensitive behavior.

## Review Lenses

### Architecture
- Did the change stay within the expected ownership boundary?
- If it crossed boundaries, was that coordinated and documented?
- Did it reinforce or erode the intended structure of the repo?

### Security and Auth
- Did the change alter auth, session, role, or privilege behavior?
- Did it widen service-role usage or expose new sensitive paths?
- Did it keep unauthorized behavior safely failing?

### Contracts
- Did route or data shape changes stay coordinated across producers and consumers?
- Are UI expectations still aligned with server responses?
- If a contract changed, is it recorded in `docs/exec_plans.md`?

### Verification
- Was the verification proportional to the risk of the change?
- Did QA provide evidence instead of only a conclusion?
- Are important gaps and residual risks stated explicitly?

### Operability
- Does the change create rollout or migration risk?
- Does it introduce hidden assumptions about local state, environment variables, or external services?
- Is there enough documentation for future agents to understand the decision?

## Output Format
When returning review results, prefer this shape:

```md
Reviewer outcome: approved | approved with residual risk | changes required
- Findings:
  - concrete issue or "none"
- Verification assessment:
  - sufficient | insufficient
- MCP evidence:
  - source used or "none"
- Residual risk:
  - concrete remaining risk
```

Keep findings specific and actionable.

## Blockers
`@reviewer` should block completion when:
- multi-file or multi-layer work skipped review expectations,
- high-risk changes lack meaningful verification,
- auth or permission behavior changed without clear evidence,
- a contract changed without coordinated updates,
- architecture drift is introduced without explicit approval,
- the change relies on hidden assumptions that future agents cannot discover in-repo.

## Approval With Residual Risk
Use this when the change is acceptable to merge or continue, but still needs a clear note about:
- missing manual environment validation,
- follow-up monitoring,
- rollout sequencing,
- technical debt that was intentionally deferred.

## Escalation Rules
`@reviewer` should escalate when:
- the intended architecture is ambiguous,
- the task appears to require a product decision rather than a code-quality decision,
- the repository lacks enough documentation to judge a boundary safely,
- QA and implementation evidence conflict.
