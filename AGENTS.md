# Agent Table of Contents

Start here, then follow the referenced files instead of adding large monolithic instructions to this file.

## Core References
- Architecture and repository boundaries: `docs/architecture.md`
- Strict coding constraints and review gates: `docs/coding_standards.json`
- Active execution plans, delivery history, and known tech debt: `docs/exec_plans.md`
- Agentic support docs and templates: `docs/agentic/README.md`
- QA operating guide: `docs/agentic/qa-playbook.md`
- Reviewer operating guide: `docs/agentic/reviewer-playbook.md`
- MCP operating guide: `docs/agentic/mcp-playbook.md`
- Supabase MCP is part of the workspace baseline; use the documented safe mode defaults before making direct database assumptions.

## Operating Model
- The main agent acts as `PM Agent` and orchestrates work.
- Keep this file small. Store durable detail in the referenced docs instead of expanding this file.
- Do not present multi-file or multi-layer work as complete until it has been checked against `docs/coding_standards.json`.
- Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, or related docs without the user having to ask explicitly.

## Harness Roles
- `@coder_backend`
  Owns API routes, server-side domain logic, auth/session flows, Supabase integration, migrations, scripts, and backend tests.
- `@coder_frontend`
  Owns App Router UI surfaces, components, hooks, client state, visual behavior, and frontend tests.
- `@qa`
  Owns verification execution, smoke-test passes, regression checks, and reproducible validation notes.
- `@reviewer`
  Owns architecture drift checks, security review, contract validation, and verification review.

## Harness Mapping
- `@coder_backend` => spawn `worker`
- `@coder_frontend` => spawn `worker`
- `@qa` => spawn `explorer` for read-only verification planning, or `worker` when implementing dedicated test assets or smoke-test helpers
- `@reviewer` => spawn `explorer` for read-only review, or `default` when broader reasoning is required
- repository exploration, impact analysis, and tracing => spawn `explorer`
