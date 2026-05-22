# Maintenance Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin-controlled maintenance mode that blocks regular users and shows an admin-authored message.

**Architecture:** Store maintenance state in the existing `settings` table and parse it through `src/lib/settings.ts`. Gate page/API requests in middleware while preserving admin/auth/static access. Add a `/maintenance` page and admin dashboard controls that save through the existing `/api/settings` route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS, Vitest.

---

### Task 1: Extend Settings Model

**Files:**
- Modify: `src/lib/settings.ts`
- Modify: `src/lib/settings.test.ts`
- Modify: `src/app/api/settings/route.ts`
- Modify: `src/app/api/settings/route.test.ts`

**Step 1: Add failing tests**

Add expectations that `parseSettingsRows` reads:

```ts
maintenance_enabled: true
maintenance_message: 'Maintenance in progress'
```

Add route validation expectations that `PUT /api/settings` accepts `maintenance_enabled` as boolean and `maintenance_message` as string.

**Step 2: Run focused tests**

Run:

```bash
npm test -- src/lib/settings.test.ts src/app/api/settings/route.test.ts
```

Expected: fails because fields are not implemented.

**Step 3: Implement settings fields**

Update `AppSettings` with:

```ts
maintenance: {
  enabled: boolean
  message: string
}
```

Update defaults:

```ts
maintenance: {
  enabled: false,
  message: 'We are performing scheduled maintenance. Please check back soon.',
}
```

Parse keys:

```ts
maintenance_enabled
maintenance_message
```

Build rows for the same keys.

Update settings route validation to accept `maintenance.enabled` boolean and `maintenance.message` string.

**Step 4: Run focused tests again**

Run:

```bash
npm test -- src/lib/settings.test.ts src/app/api/settings/route.test.ts
```

Expected: pass.

---

### Task 2: Add Maintenance Gate

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/lib/supabase/middleware.ts`
- Create: `src/lib/maintenance.ts`
- Create: `src/app/maintenance/page.tsx`

**Step 1: Add maintenance helper**

Create `src/lib/maintenance.ts` with server-side helpers to fetch settings rows and return defaults on failure.

**Step 2: Gate middleware**

Update middleware flow:

- Always allow `/maintenance`, `/_next/*`, public assets, and `/api/auth/*`.
- When maintenance is off, keep current behavior.
- When maintenance is on:
  - Allow `/dashboard/admin` and `/api/admin/*` only if current user profile has `is_admin`.
  - Redirect normal pages to `/maintenance`.
  - Return `503` JSON for non-admin `/api/*`.

**Step 3: Add page**

Add `/maintenance` page that reads current message and shows full-screen maintenance UI.

**Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: pass.

---

### Task 3: Add Admin Controls

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

**Step 1: Add state**

Add admin page state for:

```ts
maintenanceEnabled
maintenanceMessage
maintenanceSaving
```

**Step 2: Load existing settings**

Fetch `/api/settings` after admin auth succeeds and populate state from `settings.maintenance`.

**Step 3: Save settings**

Send:

```ts
PUT /api/settings
{
  maintenance: {
    enabled: maintenanceEnabled,
    message: maintenanceMessage,
  }
}
```

Show toast success/error using existing `useToast`.

**Step 4: Render controls**

Add a compact card in admin dashboard with toggle, textarea, and save button.

**Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: pass.

---

### Task 4: Final Verification

**Files:**
- Review: `docs/coding_standards.json`

**Step 1: Run tests**

Run:

```bash
npm test
```

Expected: pass.

**Step 2: Run build**

Run:

```bash
npm run build
```

Expected: pass.

**Step 3: Manual smoke checklist**

- Maintenance off: `/dashboard` loads normally for user.
- Maintenance on: user route redirects to `/maintenance`.
- Maintenance on: non-admin API returns `503`.
- Maintenance on: admin dashboard remains accessible.
- Admin can turn maintenance off.

**Step 4: Commit**

```bash
git add src/lib/settings.ts src/lib/settings.test.ts src/app/api/settings/route.ts src/app/api/settings/route.test.ts src/lib/maintenance.ts src/middleware.ts src/lib/supabase/middleware.ts src/app/maintenance/page.tsx src/app/dashboard/admin/page.tsx docs/plans/2026-05-22-maintenance-mode-design.md docs/plans/2026-05-22-maintenance-mode-implementation.md
git commit -m "feat: add maintenance mode"
```
