import { describe, expect, it } from 'vitest'

import { config, proxy } from './proxy'

describe('src/proxy', () => {
  it('exports a proxy handler function', () => {
    expect(typeof proxy).toBe('function')
  })

  it('keeps the auth/session matcher exclusions intact', () => {
    expect(config).toEqual({
      matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|api/auth/).*)',
      ],
    })
  })
})
