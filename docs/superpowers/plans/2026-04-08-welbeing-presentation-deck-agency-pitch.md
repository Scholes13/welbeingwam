# Welbeing Presentation Deck Agency Pitch Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan when work is delegated in a separate session.

**Goal:** Mengubah deck Welbeing menjadi pitch deck editorial-luxury yang lebih estetik, lebih bervariasi per slide, dan tetap menjaga kejelasan demo fitur.

**Architecture:** Pertahankan pipeline PowerPoint generator yang sudah ada, lalu ubah struktur copy, sistem warna, dan layout per slide supaya deck terasa seperti agency pitch deck. Regenerate slide export dan lakukan QA visual ulang lewat preview browser.

**Tech Stack:** PowerShell, PowerPoint COM automation, local visual assets, Playwright screenshot CLI

---

## Chunk 1: Narrative And Art Direction

### Task 1: Ringkas copy supaya lebih pitch-like

**Files:**
- Modify: `docs/presentations/welbeing-user-demo/slide-content.json`

- [ ] Pendekkan title, summary, dan bullet agar tiap slide terasa seperti satu ide besar.
- [ ] Jaga isi tetap fokus pada dashboard, Strava, quiz, leaderboard, dan point.

### Task 2: Rekam arah desain baru

**Files:**
- Create: `docs/superpowers/specs/2026-04-08-welbeing-presentation-deck-agency-pitch-design.md`
- Modify: `docs/exec_plans.md`

- [ ] Catat arah `editorial luxury agency pitch deck`.
- [ ] Tambahkan status dan catatan progres pada execution log.

## Chunk 2: Generator Refactor

### Task 3: Bangun ritme slide yang berbeda-beda

**Files:**
- Modify: `scripts/generate_welbeing_presentation.ps1`

- [ ] Ubah palette ke nuansa ivory, charcoal, stone, dan copper.
- [ ] Rebuild tiap slide agar punya komposisi yang berbeda, tidak memakai formula overlay yang sama.
- [ ] Besarkan screenshot produk pada slide yang membutuhkan bukti visual.
- [ ] Perbarui preview HTML agar selaras dengan art direction baru.

## Chunk 3: Output And QA

### Task 4: Regenerate deck

**Files:**
- Output: `docs/presentations/welbeing-user-demo/welbeing-user-demo.pptx`
- Output: `docs/presentations/welbeing-user-demo/export/*`
- Output: `docs/presentations/welbeing-user-demo/index.html`

- [ ] Jalankan generator PowerPoint.
- [ ] Pastikan export slide berhasil untuk semua 7 slide.

### Task 5: Visual QA dan verifikasi repo

**Files:**
- Output: `docs/presentations/welbeing-user-demo/qa/*`

- [ ] Ambil screenshot preview browser terbaru.
- [ ] Cek ulang slide export untuk kebocoran layout, crop aneh, atau spacing yang lemah.
- [ ] Jalankan `npm run verify:harness`.
