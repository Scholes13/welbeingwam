# MCP Playbook

This playbook documents the workspace MCP baseline for Welbeing and how each harness role should use it.

## MCP-First Rule
- Start with repository docs and code when the answer is local to Welbeing.
- If the task needs current external documentation, hosted repository context, browser state, or live project inspection, use the smallest matching MCP before relying on memory or guesswork.
- `PM Agent` is responsible for selecting the MCP surface up front and reflecting that expectation in sub-agent handoff prompts.
- Sub-agents should treat MCP usage as part of task execution, not as optional extra research.

## Workspace MCP Baseline
The repository MCP configuration lives in `.mcp.json`.

Configured servers:
- `supabase`
  Supabase remote MCP server for project-aware database, docs, debugging, and development tooling.
- `context7`
  Up-to-date library and framework documentation.
- `openaiDeveloperDocs`
  Official OpenAI developer documentation MCP server.
- `github`
  GitHub's official remote MCP server.
- `chrome-devtools`
  Chrome DevTools MCP server for browser inspection, screenshots, console, and performance debugging.

## Role-to-MCP Guidance

### `PM Agent`
- Read repository docs first for local architecture truth, then choose the smallest MCP surface that matches the missing context.
- When delegating, state both ownership and the preferred MCP server so the sub-agent does not rediscover tooling policy from scratch.
- Prefer one primary MCP per handoff unless the task clearly spans multiple external contexts.
- Require evidence from MCP-backed lookups in handoffs when a conclusion depends on current external state.
- Keep OpenAI-related lookups on `openaiDeveloperDocs` and Supabase project-state lookups on `supabase` unless a repo-local source already answers the question.

### `@coder_backend`
- Prefer `supabase` for schema discovery, migrations visibility, advisors, logs, and safe database inspection.
- Prefer `context7` for current framework and package behavior.
- Use `github` for PR, issue, workflow, and repository context when the task reaches beyond the local checkout.
- Use `openaiDeveloperDocs` only for OpenAI-specific implementation work.
- Do not jump straight to raw SQL or speculative platform assumptions when the matching MCP server can answer the question safely.

### `@coder_frontend`
- Prefer `context7` for current frontend package behavior.
- Use `chrome-devtools` for debugging live UI behavior, network requests, screenshots, and console errors.
- Use `github` when frontend work depends on PR context, workflow runs, or repository-side discussion.
- Use `openaiDeveloperDocs` for any OpenAI-driven UI or Apps SDK work instead of relying on stale examples.

### `@qa`
- Prefer `supabase` for safe inspection of migrations, advisors, and service logs related to backend or auth regressions.
- Prefer `chrome-devtools` for smoke tests, UI validation, screenshots, console inspection, and user-flow evidence.
- Use `github` for CI run context or PR-linked validation.
- Use `context7` only when verification depends on current tool behavior.
- Capture which MCP-backed evidence was used when verification conclusions depend on hosted state, logs, or browser behavior.

### `@reviewer`
- Use `supabase` when reviewing migration impact, advisors, logs, or schema-level drift.
- Use `github` to inspect PR and workflow context when needed.
- Use `context7` when standards questions depend on current framework behavior.
- Use `openaiDeveloperDocs` for OpenAI-specific review questions.
- Use `chrome-devtools` only when reviewing browser-visible regressions or QA evidence.
- Challenge conclusions that rely on memory where a configured MCP server could have provided current evidence.

## PM Dispatch Contract
When `PM Agent` hands work to a sub-agent, the handoff should include:
- owned boundary,
- expected files or surfaces,
- the preferred MCP server if live context is needed,
- the reason that MCP is relevant,
- and the evidence shape expected back.

Short example:

```md
Owner: `@coder_backend`
Scope: inspect Supabase migration drift for attendance reward logic
Preferred MCP: `supabase`
Why: current schema, advisors, and logs matter more than memory
Return: concise findings with affected tables, migrations, and any residual risk
```

## MCP Selection Heuristics
- `supabase`: project schema, migrations, advisors, logs, docs, and safe SQL-adjacent inspection for this configured project
- `context7`: up-to-date package, framework, and library documentation
- `openaiDeveloperDocs`: official OpenAI API, Responses API, Apps SDK, Codex, and related documentation
- `github`: pull requests, issues, workflow runs, comments, branches, and repository-hosted context beyond the local checkout
- `chrome-devtools`: browser state, console errors, screenshots, network traces, and performance or rendering inspection

## Decision Order
1. Check in-repo docs and code for Welbeing-specific truth.
2. If the missing context maps to a configured MCP server, use that MCP.
3. Only widen the search surface when the repo and configured MCPs still do not answer the question.

## Server Notes

### `supabase`
- Remote HTTP server at `https://mcp.supabase.com/mcp`
- Configured in this repo with:
  - `project_ref=${SUPABASE_PROJECT_REF}`
  - `read_only=true`
  - `features=database,debugging,development,docs`
- This follows Supabase's recommendation to avoid connecting MCP to production data and to prefer read-only mode when possible.
- For local Supabase CLI development, the MCP server is available at `http://localhost:54321/mcp`.
- Some clients authenticate interactively through the browser; CI or limited clients may require PAT-based `Authorization` headers instead.

### `context7`
- Local stdio server via `@upstash/context7-mcp`
- Safe default for package and framework lookups

### `openaiDeveloperDocs`
- Remote HTTP server at `https://developers.openai.com/mcp`
- Use this first for OpenAI API, Codex, Responses API, Apps SDK, and related docs

### `github`
- Remote HTTP server at `https://api.githubcopilot.com/mcp/`
- Some MCP hosts support OAuth directly
- PAT-based authentication may still be required depending on the client

### `chrome-devtools`
- Local stdio server via `chrome-devtools-mcp@latest`
- Exposes live browser contents to the client; avoid using it against sensitive personal sessions
- Best used for QA, frontend debugging, and browser-visible bug reproduction

## Operational Rules
- Prefer the smallest MCP surface that solves the task.
- Do not use external MCP context when the answer already exists clearly in-repo.
- Prefer `supabase` for safe database introspection before writing ad hoc SQL against project state.
- For OpenAI-related questions, prefer `openaiDeveloperDocs` before web browsing.
- For UI debugging, prefer `chrome-devtools` over guesswork when the browser state matters.
- For GitHub workflow or PR context, prefer `github` over reconstructing context from memory.
- When a sub-agent report depends on live external context, cite which MCP server supplied that context.

## Setup Caveats
- `supabase` is configured in safe mode by default, but it still grants meaningful project visibility and should not be pointed at production casually.
- Supabase docs recommend development or test projects, project scoping, and read-only mode when real data is involved.
- If your MCP client cannot authenticate Supabase interactively, use the PAT-header approach documented by Supabase for CI-style environments.
- Remote MCP authentication behavior varies by host.
- `github` may require OAuth support or a PAT in the MCP host.
- `chrome-devtools` works best when Chrome can be launched or attached reliably on the local machine.
- After changing `.mcp.json`, restart or reload the MCP-aware client before assuming the config failed.
