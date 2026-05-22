# Audit Point Search Design

## Goal
Add quick search to the Audit Poin tab so admins can find visible audit items by person or activity details.

## Behavior
- Search applies to the currently active Audit Poin sub-tab.
- `Aktif` searches the items currently shown in that tab.
- `Riwayat Reject` searches the rejected history items currently shown in that tab.
- Tab counters continue to show the original totals.
- Empty state explains when no item matches the query.

## Search Fields
The query matches:

- user full name
- activity name/title/type
- dimension name/display name
- date text
- current point value

## Approach
Use client-side filtering over already loaded data. This avoids API changes and is enough for the current audit list size.

## Verification
- `npm run build`
- Manual smoke: type a known user name in each Audit Poin sub-tab and confirm visible results shrink correctly.
