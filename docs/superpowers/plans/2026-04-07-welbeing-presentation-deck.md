# Welbeing Presentation Deck Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 7-slide Bahasa Indonesia presentation deck for Welbeing, generate a real `.pptx`, and produce a browser-previewable export for visual QA.

**Architecture:** Keep the source of truth small and local: one content file describes the slide copy, one PowerShell generator script creates the PowerPoint deck plus PNG slide exports, and one generated HTML preview page displays the exported slides for browser inspection. This avoids adding npm dependencies while still producing a polished, editable presentation artifact.

**Tech Stack:** PowerShell, Microsoft PowerPoint COM automation, static HTML preview, Playwright for screenshot QA

---

## Chunk 1: Deck Source And Generator

### Task 1: Define deck content source

**Files:**
- Create: `docs/presentations/welbeing-user-demo/slide-content.json`

- [ ] **Step 1: Write the deck source file**

Include 7 slides with:
- a title,
- a subtitle or summary,
- short supporting bullets,
- section labels for the generator to render.

- [ ] **Step 2: Review source content for language and scope**

Check that the copy stays in Bahasa Indonesia, fits the approved narrative, and only mentions repo-backed features: dashboard, Strava, quiz or survey, points, leaderboard.

### Task 2: Create the PowerPoint generator

**Files:**
- Create: `scripts/generate_welbeing_presentation.ps1`

- [ ] **Step 1: Write generator helpers**

Add focused helper functions for:
- ensuring output directories exist,
- opening and closing PowerPoint safely,
- setting slide size and base background,
- adding text, rounded cards, labels, accent lines, and simple UI mockups,
- exporting each slide as PNG.

- [ ] **Step 2: Implement the 7 slide builders**

Build one function or branch per slide:
- cover,
- product overview,
- dashboard journey,
- Strava integration,
- quiz or survey flow,
- point and leaderboard,
- closing.

- [ ] **Step 3: Generate outputs from one command**

The script should produce:
- `docs/presentations/welbeing-user-demo/welbeing-user-demo.pptx`
- `docs/presentations/welbeing-user-demo/export/slide-01.png` through `slide-07.png`
- `docs/presentations/welbeing-user-demo/index.html`

## Chunk 2: Run And Verify

### Task 3: Run the generator and validate outputs

**Files:**
- Modify: `docs/presentations/welbeing-user-demo/slide-content.json`
- Modify: `scripts/generate_welbeing_presentation.ps1`
- Output: `docs/presentations/welbeing-user-demo/welbeing-user-demo.pptx`
- Output: `docs/presentations/welbeing-user-demo/export/*`
- Output: `docs/presentations/welbeing-user-demo/index.html`

- [ ] **Step 1: Run the generator**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate_welbeing_presentation.ps1
```

Expected:
- script exits successfully,
- pptx exists,
- all 7 exported PNGs exist,
- preview HTML exists.

- [ ] **Step 2: Smoke-check file outputs**

Run:

```powershell
Get-ChildItem .\docs\presentations\welbeing-user-demo -Recurse
```

Expected:
- output tree contains the pptx, preview html, and slide export directory.

### Task 4: Browser QA with screenshots

**Files:**
- Output: `docs/presentations/welbeing-user-demo/qa/full-page.png`
- Output: `docs/presentations/welbeing-user-demo/qa/slide-*.png`

- [ ] **Step 1: Open preview in browser automation**

Use Playwright or browser automation against:

```text
file:///I:/Project/Welbeing/docs/presentations/welbeing-user-demo/index.html
```

- [ ] **Step 2: Capture screenshots and inspect layout**

Take:
- one full-page screenshot,
- one or more viewport screenshots over the most visually dense slides.

Check for:
- text clipping,
- misalignment,
- unexpected overflow,
- spacing that feels cramped or inconsistent.

- [ ] **Step 3: If layout issues appear, adjust generator and rerun**

Repeat generator plus screenshot pass until the preview looks tidy.

## Chunk 3: Final Repo Hygiene

### Task 5: Record completion and summarize verification

**Files:**
- Modify: `docs/exec_plans.md`

- [ ] **Step 1: Update task notes**

Record:
- generated deck path,
- preview QA path,
- verification command used,
- remaining limitations if any.

- [ ] **Step 2: Run repo-safe verification**

Run:

```powershell
npm run verify:harness
```

Expected:
- harness verification passes after the docs and script additions.

- [ ] **Step 3: Prepare final handoff**

Summarize:
- where the `.pptx` lives,
- where the preview lives,
- whether browser QA passed,
- any remaining manual polish suggestions.
