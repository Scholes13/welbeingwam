import { describe, expect, it } from 'vitest'

import { createActivityScanToken, verifyActivityScanToken } from './activity-scan-token'

const SECRET = 'test-secret'

describe('activity scan token', () => {
  it('creates and verifies a valid token payload', () => {
    const token = createActivityScanToken({
      activityId: 'activity-123',
      secret: SECRET,
      expiresInSeconds: 45,
      now: new Date('2026-02-17T10:00:00.000Z'),
    })

    const payload = verifyActivityScanToken({
      token,
      secret: SECRET,
      now: new Date('2026-02-17T10:00:10.000Z'),
    })

    expect(payload.activityId).toBe('activity-123')
    expect(payload.expiresAt).toBe('2026-02-17T10:00:45.000Z')
  })

  it('throws for expired tokens', () => {
    const token = createActivityScanToken({
      activityId: 'activity-123',
      secret: SECRET,
      expiresInSeconds: 45,
      now: new Date('2026-02-17T10:00:00.000Z'),
    })

    expect(() =>
      verifyActivityScanToken({
        token,
        secret: SECRET,
        now: new Date('2026-02-17T10:00:46.000Z'),
      })
    ).toThrow('Token expired')
  })

  it('throws for tampered tokens', () => {
    const token = createActivityScanToken({
      activityId: 'activity-123',
      secret: SECRET,
      expiresInSeconds: 45,
      now: new Date('2026-02-17T10:00:00.000Z'),
    })

    const [payload, signature] = token.split('.')
    const tamperedSignature = `${signature?.slice(0, -1) ?? ''}x`
    const tampered = `${payload}.${tamperedSignature}`

    expect(() =>
      verifyActivityScanToken({
        token: tampered,
        secret: SECRET,
        now: new Date('2026-02-17T10:00:10.000Z'),
      })
    ).toThrow('Invalid token signature')
  })
})
