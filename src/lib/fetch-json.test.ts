import { describe, expect, it } from 'vitest'

import { fetchJson } from './fetch-json'

describe('fetchJson', () => {
  it('returns parsed JSON when the response is ok', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ ok: true, value: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    await expect(fetchJson('https://example.com', { fetchImpl: fetchMock })).resolves.toEqual({
      ok: true,
      value: 42,
    })
  })

  it('throws the API error message when the response is not ok', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ error: 'Settings store unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })

    await expect(fetchJson('https://example.com', { fetchImpl: fetchMock })).rejects.toThrow(
      'Settings store unavailable',
    )
  })

  it('falls back to a generic status message when the error body is not JSON', async () => {
    const fetchMock = async () =>
      new Response('temporarily unavailable', {
        status: 502,
        statusText: 'Bad Gateway',
      })

    await expect(fetchJson('https://example.com', { fetchImpl: fetchMock })).rejects.toThrow(
      'Request failed: 502 Bad Gateway',
    )
  })
})
