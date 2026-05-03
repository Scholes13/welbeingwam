# Welbeing Presentation Deck Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Welbeing presentation deck into an image-led 7-slide `.pptx` that combines employee wellness photography, real app screenshots, and glassmorphism text panels.

**Architecture:** Keep the existing deck pipeline, but add a local asset layer for downloaded lifestyle images and app screenshots, then update the PowerPoint generator to place those assets as full-bleed or framed visual anchors on each slide. Export slides again and run browser QA on the refreshed preview.

**Tech Stack:** PowerShell, Microsoft PowerPoint COM automation, HTTP asset download, Playwright screenshot CLI

---

## Chunk 1: Gather Visual Assets

### Task 1: Capture real app screenshots

**Files:**
- Create: `docs/presentations/welbeing-user-demo/assets/app/*`

- [ ] Log in to `https://welbeing.netlify.app` with the approved credentials and capture screenshots for dashboard, leaderboard, quiz or survey, and one profile or settings surface.
- [ ] Save the selected screenshots into `docs/presentations/welbeing-user-demo/assets/app/`.
- [ ] Prefer clean, content-rich screenshots with minimal loading overlays.

### Task 2: Download employee wellness imagery

**Files:**
- Create: `docs/presentations/welbeing-user-demo/assets/photos/*`

- [ ] Download a small curated set of employee wellness or office-health images from the internet.
- [ ] Prefer photos that feel corporate, optimistic, and modern rather than intense sports imagery.
- [ ] Save only the final selected images into the workspace so the deck generator can reference local files.

## Chunk 2: Rebuild Deck With Images

### Task 3: Update source content and generator to support image-led slides

**Files:**
- Modify: `docs/presentations/welbeing-user-demo/slide-content.json`
- Modify: `scripts/generate_welbeing_presentation.ps1`

- [ ] Extend slide metadata to reference local image assets.
- [ ] Add helper logic for inserting and cropping images, layering overlays, and placing glass-style text cards on top.
- [ ] Update all 7 slides to use images as primary composition anchors rather than relying on generic shapes.

### Task 4: Regenerate deck outputs

**Files:**
- Output: `docs/presentations/welbeing-user-demo/welbeing-user-demo.pptx`
- Output: `docs/presentations/welbeing-user-demo/export/*`
- Output: `docs/presentations/welbeing-user-demo/index.html`

- [ ] Run the PowerPoint generator again.
- [ ] Confirm the new `.pptx`, slide exports, and preview HTML are produced successfully.

## Chunk 3: Visual QA

### Task 5: Browser and slide inspection

**Files:**
- Output: `docs/presentations/welbeing-user-demo/qa/*`

- [ ] Re-run browser screenshots against the refreshed preview.
- [ ] Inspect the exported slides for text readability, image cropping, and awkward empty space.
- [ ] Fix any slide that still feels too plain, too crowded, or visually inconsistent.

### Task 6: Record completion

**Files:**
- Modify: `docs/exec_plans.md`

- [ ] Update execution notes with the refreshed deck status and asset-backed design approach.
- [ ] Re-run `npm run verify:harness`.
