# Auth Canonicalization And Duplicate Email Cleanup Design

**Date:** 2026-04-01
**Status:** approved in chat, pending implementation plan

## Goal
Eliminate duplicate Supabase Auth identities so each profile has exactly one canonical auth user at `lower(username)@werkudara.com`, while preserving all existing history in `public.profiles` and every related business table.

## Confirmed Constraints
- Username login must remain available and become case-insensitive.
- Canonical auth email format is `lower(username)@werkudara.com`.
- `manual-login` must continue working, but it should authenticate against the canonical auth identity instead of `@wam.local` and must stop depending on `profiles.password`.
- All auth passwords will be reset to `werkudara88`.
- All active sessions will be revoked so users must log in again.
- Existing history in `profiles`, `activities`, `user_rewards`, `attendance`, `notifications`, and related tables must not be reset or remapped.

## Repository And Data Evidence
- `auth.users` currently has 118 rows while `public.profiles` has 59 rows.
- Each profile username has two auth records: one `@wam.local` and one `@werkudara.com`.
- `public.profiles.auth_user_id` is `NULL` for all 59 profiles.
- Login code is split today:
  - `src/app/api/auth/standard-login/route.ts` signs in with `@werkudara.com`
  - `src/app/api/auth/manual-login/route.ts` signs in with `@wam.local`
- `src/utils/auth.ts` still resolves profiles by parsing username from auth email instead of preferring `auth_user_id`.

## Recommended Approach
Use the existing `@werkudara.com` auth user as the canonical identity for each profile, backfill `profiles.auth_user_id` to that user, reset the canonical auth credentials, revoke sessions, update runtime code to always derive the canonical email from username, audit all live references to `auth.users`, and then remove the duplicate `@wam.local` auth user once verification passes.

This keeps business data stable because the primary business history remains attached to `public.profiles.id`. Any tables that reference `auth.users.id` directly must be inventoried explicitly before legacy-auth deletion so they are preserved, remapped, or intentionally nulled by design instead of by accident.

## Why This Approach
- It matches the existing `standard-login` route and the desired future admin creation direction.
- It avoids moving transactional data across tables.
- It gives one clear source of truth for future auth logic.
- It removes the need for mixed-domain compatibility after rollout.

## Alternatives Considered

### Promote `@wam.local` then rename
Keep the legacy auth identity and mutate it into `@werkudara.com`.

Why not recommended:
- fights the direction already present in `standard-login` and admin user creation,
- keeps more legacy assumptions in place,
- makes future audit reasoning harder because the newer canonical accounts already exist.

### Keep both auth identities temporarily
Retain both domains and add runtime bridging.

Why not recommended:
- preserves dual source of truth,
- increases bug surface in login and profile resolution,
- delays the real cleanup the user explicitly requested.

## Target State
- Every profile has a non-null `profiles.auth_user_id`.
- `profiles.auth_user_id` points to the matching `auth.users.id` where `auth.users.email = lower(profiles.username) || '@werkudara.com'`.
- No `@wam.local` rows remain in `auth.users`.
- Username login is case-insensitive and normalizes to canonical email before `signInWithPassword`.
- Access-code login signs in through the canonical auth email.
- Profile resolution prefers `auth_user_id` and only uses username/email fallback as a temporary safety rail during rollout.
- New admin-created users are created only as `@werkudara.com` auth users and linked immediately.

## Data Repair Design

### Canonical Mapping
For each row in `public.profiles`:
1. Compute `canonical_username = lower(trim(username))`.
2. Locate the matching `auth.users` row at `canonical_username || '@werkudara.com'`.
3. Set `profiles.auth_user_id` to that auth user ID.

### Password Reset
For every canonical auth user:
1. Update password to `werkudara88`.
2. Keep user metadata aligned to canonical username/full name where possible.
3. Treat the shared reset password as a temporary operational state that future rotations can replace.

### Session Revocation
After passwords are reset:
1. Use the Supabase Auth JS revocation surface already present in local dependencies: `supabase.auth.admin.signOut(jwt, 'global')` for server-side refresh-token revocation when a valid session JWT is available, and `supabase.auth.signOut({ scope: 'global' })` for current-session smoke validation.
2. Do not rely on ad hoc SQL deletes against auth session tables as the primary revocation path.
3. Document and verify the expected access-token grace window, because existing access tokens may remain valid until expiry even after refresh tokens are revoked.
4. Users must log in again with the reset password once their old session can no longer refresh.

### Direct `auth.users` Reference Audit
Before deleting legacy auth users:
1. Inventory every schema object that references `auth.users.id`.
2. Declare the preserve, remap, or null behavior for each direct reference.
3. Block deletion if any direct reference still depends on a `@wam.local` identity unexpectedly.

### Legacy Auth Removal
After canonical mapping and login verification pass:
1. Identify `@wam.local` auth users with the same normalized username.
2. Confirm the direct `auth.users` reference audit is clean.
3. Delete those legacy auth rows.
4. Re-run integrity checks to confirm no profile points at a deleted auth user and no direct `auth.users` reference was orphaned unintentionally.

## Runtime Code Changes

### Login Normalization
- Normalize username input with `trim().toLowerCase()` before deriving auth email.
- `standard-login` should always call `signInWithPassword` using `normalizedUsername + '@werkudara.com'`.
- `manual-login` should fetch the profile by access code, normalize the profile username, then sign in with `normalizedUsername + '@werkudara.com'`.
- `manual-login` must stop reading `profiles.password` and instead use the reset-password value from a server-controlled configuration path during this cleanup rollout.

### Auth Context Resolution
- Update `resolveProfileIdFromAuthUser()` to prefer `profiles.auth_user_id = auth.users.id`.
- Keep username/email fallback only as a temporary compatibility path during rollout, with explicit logging if fallback is used.
- Add a follow-up integrity guard so canonical drift is visible if fallback resolution is used after rollout.

### Admin User Creation
- Admin user creation is part of the remediation surface and must no longer be treated as aligned with the target design.
- New admin-created users must create only one auth user under `@werkudara.com`.
- The profile insert path must preserve `public.profiles.id bigint`, store the auth UUID in `auth_user_id`, and avoid inserting UUID values into `profiles.id`.
- Username uniqueness checks should use normalized case-insensitive matching to avoid reintroducing canonical drift.

### Database Invariants
- Add a concrete unique index for canonical auth linkage:
  - `CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique ON public.profiles (auth_user_id) WHERE auth_user_id IS NOT NULL`
- Add a concrete case-insensitive uniqueness guard for canonical usernames:
  - `CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_canonical_unique ON public.profiles ((lower(trim(username)))) WHERE username IS NOT NULL`
- Treat failure to add either index as a rollout blocker, because future duplicate admin-create or migration paths would otherwise be able to reintroduce auth drift.

## Verification Design
- Focused automated coverage for:
  - case-insensitive username login,
  - manual login resolving to canonical `@werkudara.com` without reading `profiles.password`,
  - auth context resolution preferring `auth_user_id`,
  - admin user creation preserving bigint profile IDs while linking `auth_user_id`,
  - duplicate-auth detection for normalized usernames.
- Supabase integrity checks for:
  - profiles missing `auth_user_id`,
  - profiles whose `auth_user_id` does not match canonical `@werkudara.com`,
  - remaining `@wam.local` auth users,
  - normalized usernames with more than one auth row,
  - schema objects or live rows that still reference legacy `@wam.local` auth IDs directly,
  - presence of `profiles_auth_user_id_unique` and `profiles_username_canonical_unique`.
- Manual smoke checks for:
  - username login,
  - access-code login,
  - admin login,
  - admin create user,
  - auth session revocation behavior after reset, including the refresh-token failure path and the observed access-token grace window.
- Application verification:
  - `npm run build`

## Rollout Sequence
1. Add tests that capture the mixed-domain bug and expected canonical behavior.
2. Add integrity script/query helpers for canonical auth mapping.
3. Update runtime code to normalize usernames, stop `manual-login` from reading `profiles.password`, and prefer `auth_user_id`.
4. Fix admin user creation so new users preserve bigint profile IDs and link `auth_user_id` immediately.
5. Add and verify the concrete unique indexes for `auth_user_id` and canonical username.
6. Run the data repair script against the canonical `@werkudara.com` accounts.
7. Audit all direct `auth.users` references and verify the legacy-delete policy.
8. Verify logins, canonical mappings, session revocation behavior, and `npm run build`.
9. Delete legacy `@wam.local` auth rows.
10. Re-run verification and document residual risk.

## Operational Risks
- Any profile without a valid `@werkudara.com` auth row must block legacy deletion.
- Runtime fallback to username lookup should be temporary; leaving it indefinitely would hide future drift.
- Forced password reset to a shared password is user-approved for this cleanup, but should be treated as a temporary operational step and rotated later if security expectations tighten.
- Any path that still writes plaintext credential material into `profiles.password` after rollout is a blocker, not a tolerated follow-up.

## Out Of Scope
- Migrating `public.profiles.id` away from bigint.
- Reworking all downstream business tables to UUID user IDs.
- Broader auth architecture remediation beyond this canonicalization and cleanup pass.
