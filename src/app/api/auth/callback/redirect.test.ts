import { describe, expect, it } from 'vitest'

import { buildStravaCallbackRedirect } from './redirect'

describe('buildStravaCallbackRedirect', () => {
  it('points successful connections back to profile settings', () => {
    expect(
      buildStravaCallbackRedirect({
        origin: 'https://welbeing.app',
        strava: 'connected',
      }),
    ).toBe('https://welbeing.app/profile/settings?strava=connected')
  })

  it('points callback errors back to profile settings', () => {
    expect(
      buildStravaCallbackRedirect({
        origin: 'https://welbeing.app',
        error: 'strava_failed',
      }),
    ).toBe('https://welbeing.app/profile/settings?error=strava_failed')
  })
})
