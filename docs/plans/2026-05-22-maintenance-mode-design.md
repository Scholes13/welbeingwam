# Maintenance Mode Design

## Goal
Add admin-controlled maintenance mode that blocks regular users from the app while still allowing admins to access admin tools and disable maintenance mode.

## Chosen Approach
Use a request-level gate for strong blocking.

- Store `maintenance_enabled` and `maintenance_message` in the existing `settings` table.
- Expose the values through the existing settings API.
- Add admin controls in the admin dashboard to toggle maintenance mode and edit the message.
- Add a `/maintenance` page for blocked users.

## Routing Behavior
When maintenance mode is enabled:

- Regular app pages redirect to `/maintenance`.
- Non-admin API routes return `503` with the maintenance message.
- Admin pages, admin APIs, auth routes, and static assets remain accessible.
- Admins can still reach `/dashboard/admin` and turn maintenance mode off.

## Data Model
Settings keys:

- `maintenance_enabled`: boolean
- `maintenance_message`: string

Default values:

- `maintenance_enabled`: `false`
- `maintenance_message`: generic maintenance notice

## UI
Admin dashboard gets a small maintenance control section:

- On/off toggle
- Message textarea
- Save action

The `/maintenance` page shows:

- Maintenance title
- Admin-provided message
- Short retry instruction

## Error Handling
If the settings table is unavailable, the app defaults to maintenance mode off to avoid accidental lockout.

If saving fails, the admin UI shows an error and keeps the current local state unchanged.

## Verification
- `npm run build`
- Focused tests for settings parsing and route validation when practical
- Manual smoke path:
  - Enable maintenance mode as admin
  - Confirm regular page redirects to `/maintenance`
  - Confirm admin page remains accessible
  - Confirm non-admin API returns `503`
  - Disable maintenance mode
