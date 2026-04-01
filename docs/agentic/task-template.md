# Execution Entry Template

Use this template when adding a new meaningful work item to `docs/exec_plans.md` or when drafting a task record before it is promoted there.

## Template

```md
### YYYY-MM-DD - Task Title
- Status: planned | in_progress | review | blocked | completed
- Owner: PM Agent
- Delegates: `@coder_backend`, `@coder_frontend`, `@qa`, `@reviewer`
- Scope:
  - concise outcome 1
  - concise outcome 2
- Risks:
  - key risk 1
  - key risk 2
- Verification:
  - exact command or targeted verification step
- Notes:
  - source docs, assumptions, rollout notes, or follow-up context
```

## Guidance
- Use one entry per meaningful deliverable or investigation stream.
- Prefer concise, factual bullets over narrative paragraphs.
- If a change alters an API contract, auth/session behavior, or migration path, call that out explicitly in `Notes`.
- If verification was skipped, say so directly and explain why.
