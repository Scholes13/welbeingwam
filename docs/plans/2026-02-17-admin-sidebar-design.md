# Admin Sidebar Redesign

## Goal

Refactor the admin page navigation from horizontal tabs into a classic left sidebar so menu discovery and settings management are easier.

## Chosen Direction

- Desktop: fixed left sidebar with grouped navigation.
- Mobile: drawer sidebar with overlay and close behavior.
- Navigation grouping:
  - Management: Users, Daily Quests, Surveys, Rewards
  - Events: Activities, QR Spots, Doorprize
  - System: Admins

## UX Decisions

- Use stronger active-state treatment on selected menu item.
- Keep contextual primary action button in the top area (`Add User`, `Add Activity`, etc.).
- Keep existing tab-based data loading behavior by preserving `activeTab` as the single source of truth.
- Place `Back to Dashboard` in sidebar footer for classic admin flow.
- Add desktop collapse toggle (icon-only mini sidebar) to maximize content area without losing quick navigation.
- Persist collapse preference in `localStorage` so admin layout state is retained across sessions.

## Implementation Notes

- Added `AdminSidebar` component for desktop + mobile drawer navigation.
- Added `adminLayout` helper module for topbar metadata and contextual add-label logic.
- Added sidebar presentation helper to control expanded/collapsed mode styles in one place.
- Updated admin page layout container to two-pane structure (sidebar + content area).
- Added gradient topbar shell for stronger admin visual hierarchy.
- Added smooth width transition on desktop sidebar when toggling collapsed mode.
- Added smooth fade/slide transitions for sidebar labels and group headers between expanded/collapsed states.
- Moved activity type creation into a dedicated management modal to keep the Activities page less crowded.
- Added modal QoL: click backdrop to close and Enter key shortcut on type inputs to submit quickly.
- Added two-level activity type hierarchy (category + subcategory), with Internal Activity as parent and child-type selection in activity creation.
- Refined activity type modal responsiveness (safe viewport height, adaptive form grid, and stacked list actions for narrow screens).
- Refined create-activity modal responsiveness (adaptive width/height, sticky header, responsive time/type grids, and internal scrolling).
- Added quick-add default top categories in type management (`Internal Activity`, `External Activity`, `Community Activity`) when missing.
- Added `Add Type` shortcut from create-activity type selector to open type management directly.
- Kept existing API/data logic untouched to reduce regression risk.

## Verification

- Added unit tests for new navigation helper behavior.
- Executed:
  - `npm run test -- src/app/dashboard/admin/components/adminLayout.test.ts`
  - `npm run test -- src/app/dashboard/admin/hooks/useUserSelection.test.ts src/app/dashboard/admin/components/adminLayout.test.ts`
  - `npm run test -- src/app/dashboard/admin/components/adminLayout.test.ts src/app/dashboard/admin/hooks/useUserSelection.test.ts`
  - `npx eslint src/app/dashboard/admin/components/AdminSidebar.tsx src/app/dashboard/admin/components/adminLayout.ts src/app/dashboard/admin/components/adminLayout.test.ts`
