/**
 * Downgrade Mode Feature Flag
 *
 * When DOWNGRADE_MODE is enabled:
 * - Auto-point calculation is disabled (returns 0, pending HR manual input)
 * - Strava sync is short-circuited
 * - Quest auto-generation is skipped
 * - Activity submission uses multi-dimension form
 * - HR must manually review & assign points
 *
 * To revert: set NEXT_PUBLIC_DOWNGRADE_MODE=false or remove the env var
 */

export function isDowngradeMode(): boolean {
  return process.env.NEXT_PUBLIC_DOWNGRADE_MODE === 'true'
}

/**
 * Client-side downgrade mode check.
 *
 * Returns `false` on the server (SSR) intentionally — during server-side
 * rendering there is no `window`, so this function short-circuits to `false`
 * to avoid hydration mismatches.
 *
 * On the client it reads the `NEXT_PUBLIC_DOWNGRADE_MODE` environment variable
 * (inlined at build time by Next.js) and returns `true` when the value is
 * `"true"`.
 *
 * Server-side code should use {@link isDowngradeMode} instead, which works in
 * any environment without the `window` guard.
 */
export function isDowngradeModeClient(): boolean {
  if (typeof window === 'undefined') return false
  return process.env.NEXT_PUBLIC_DOWNGRADE_MODE === 'true'
}
