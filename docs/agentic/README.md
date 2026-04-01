# Agentic Docs

This directory holds supporting governance docs for the harness foundation. Keep durable detail here instead of expanding `AGENTS.md`.

## Files
- `task-template.md`
  Reusable execution-entry template for future plan or status records.
- `qa-playbook.md`
  Operating guide for the `@qa` role, including verification levels and evidence expectations.
- `reviewer-playbook.md`
  Operating guide for the `@reviewer` role, including blocker rules and approval outcomes.
- `mcp-playbook.md`
  Workspace MCP baseline and role-specific MCP usage guidance.
- `future-enforcement-roadmap.md`
  A backlog for stronger guardrails, audits, and recurring cleanup loops.

## MCP Note
- The workspace now includes a Supabase MCP baseline in `.mcp.json`.
- The workspace also includes `context7`, `openaiDeveloperDocs`, `github`, and `chrome-devtools` so agents can pull current external context without leaving the harness operating model.
- Keep Supabase access project-scoped and read-only by default unless a task explicitly requires a higher-risk path and the operator agrees.
- Treat `mcp-playbook.md` as the MCP-first operating guide for `PM Agent`, sub-agents, QA, and reviewer work.

## Relationship to Other Docs
- `../architecture.md`
  Source of truth for repository structure, ownership boundaries, and workflow.
- `../coding_standards.json`
  Source of truth for strict review and completion rules.
- `../exec_plans.md`
  Source of truth for active work, known risks, and delivery history.
- `../../AGENTS.md`
  Lightweight entry point for agents before they dive into deeper context.

## Operating Rule
- Do not duplicate the same long-form guidance across multiple files.
- Add durable governance here when it does not belong in architecture, standards, or execution tracking.
- Keep new docs specific, current, and easy for agents to consume quickly.
- When a task needs external documentation, browser state, GitHub context, or project-state inspection, route it through the matching configured MCP before relying on memory or ad hoc web usage.
