import { describe, expect, it } from 'vitest'

import { buildStravaAuthorizeUrl } from './authorize'

describe('buildStravaAuthorizeUrl', () => {
  it('uses the current request origin for callback redirects', () => {
    const url = buildStravaAuthorizeUrl({
      clientId: '192544',
      requestUrl: 'http://127.0.0.1:3000/api/auth/login',
    })

    expect(url).toContain(
      'redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fauth%2Fcallback',
    )
  })

  it('preserves non-default ports when generating the callback URL', () => {
    const url = buildStravaAuthorizeUrl({
      clientId: '192544',
      requestUrl: 'http://localhost:3001/api/auth/login',
    })

    expect(url).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback',
    )
  })

  it('uses forwarded host and proto when behind a reverse proxy', () => {
    const url = buildStravaAuthorizeUrl({
      clientId: '192544',
      requestUrl: 'http://localhost:8787/api/auth/login',
      forwardedHost: 'myapp.example.com',
      forwardedProto: 'https',
    })

    expect(url).toContain(
      'redirect_uri=https%3A%2F%2Fmyapp.example.com%2Fapi%2Fauth%2Fcallback',
    )
  })

  it('falls back to request URL when forwarded headers are absent', () => {
    const url = buildStravaAuthorizeUrl({
      clientId: '192544',
      requestUrl: 'https://myapp.example.com/api/auth/login',
      forwardedHost: null,
      forwardedProto: null,
    })

    expect(url).toContain(
      'redirect_uri=https%3A%2F%2Fmyapp.example.com%2Fapi%2Fauth%2Fcallback',
    )
  })
})
