import { describe, expect, it } from 'vitest'

import { getStravaCallbackErrorCode } from './errors'

describe('getStravaCallbackErrorCode', () => {
  it('maps Strava token exchange failures', () => {
    expect(
      getStravaCallbackErrorCode(
        new Error('Strava token exchange failed: [{"field":"code","code":"invalid"}]'),
      ),
    ).toBe('token_exchange_failed')
  })

  it('maps profile update failures', () => {
    expect(getStravaCallbackErrorCode(new Error('Strava profile update failed'))).toBe(
      'profile_update_failed',
    )
  })

  it('falls back to the generic code', () => {
    expect(getStravaCallbackErrorCode(new Error('Something else'))).toBe('strava_failed')
  })
})
