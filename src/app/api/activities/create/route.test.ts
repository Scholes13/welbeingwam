import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthProfileContextMock, createSupabaseAdminClientMock } = vi.hoisted(() => ({
  getAuthProfileContextMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
}))

vi.mock('@/utils/auth', () => ({
  getAuthProfileContext: getAuthProfileContextMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}))

vi.mock('@/lib/points', () => ({
  convertActivityPoints: (value: number) => Math.max(0, Math.floor(Number(value) || 0)),
  toSafeNumber: (value: unknown) => Number(value) || 0,
}))

vi.mock('@/lib/downgrade', () => ({
  isDowngradeMode: () => false,
}))

import { POST } from './route'

function createRequest(payload: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/activities/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

function createSupabaseMock(input: { sportIsCustomInput?: boolean } = {}) {
  const insertedRows: Array<Record<string, unknown>> = []
  const from = vi.fn((table: string) => {
    if (table === 'dimensions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'physical-dim' }, error: null }),
          }),
        }),
      }
    }

    if (table === 'activity_types') {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            points: 0,
            requires_steps: false,
            is_custom_input: Boolean(input.sportIsCustomInput),
            dimension_id: null,
          },
          error: null,
        }),
      }
      return query
    }

    if (table === 'activities') {
      return {
        insert: vi.fn((row: Record<string, unknown>) => {
          insertedRows.push(row)
          return Promise.resolve({ error: null })
        }),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return { supabase: { from }, insertedRows }
}

function createSupabaseMockWithoutActivityType() {
  const { supabase, insertedRows } = createSupabaseMock()
  const originalFrom = supabase.from
  supabase.from = vi.fn((table: string) => {
    if (table === 'activity_types') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }

    return originalFrom(table)
  })

  return { supabase, insertedRows }
}

describe('POST /api/activities/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthProfileContextMock.mockResolvedValue({ profileId: 'user-1' })
  })

  it('requires a custom sport name when Sport Session type is Other', async () => {
    const { supabase } = createSupabaseMock({ sportIsCustomInput: true })
    createSupabaseAdminClientMock.mockReturnValue(supabase)

    const response = await POST(createRequest({
      mode: 'sport',
      type: 'Other',
      date: '2026-05-22',
      calories: 250,
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Nama olahraga wajib diisi untuk pilihan Other',
    })
  })

  it('requires a custom sport name for Other even before the catalog row exists', async () => {
    const { supabase } = createSupabaseMockWithoutActivityType()
    createSupabaseAdminClientMock.mockReturnValue(supabase)

    const response = await POST(createRequest({
      mode: 'sport',
      type: 'Other',
      date: '2026-05-22',
      calories: 250,
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Nama olahraga wajib diisi untuk pilihan Other',
    })
  })

  it('stores custom sport name for Sport Session Other while preserving catalog type', async () => {
    const { supabase, insertedRows } = createSupabaseMock({ sportIsCustomInput: true })
    createSupabaseAdminClientMock.mockReturnValue(supabase)

    const response = await POST(createRequest({
      mode: 'sport',
      type: 'Other',
      custom_name: 'Padel',
      date: '2026-05-22',
      calories: 250,
    }))

    expect(response.status).toBe(200)
    expect(insertedRows[0]).toMatchObject({
      user_id: 'user-1',
      name: 'Padel',
      type: 'Other',
      custom_name: 'Padel',
      mode: 'sport',
      calories: 250,
      activity_points: 250,
    })
  })

  it('does not require a custom sport name for catalog sport sessions', async () => {
    const { supabase, insertedRows } = createSupabaseMock({ sportIsCustomInput: false })
    createSupabaseAdminClientMock.mockReturnValue(supabase)

    const response = await POST(createRequest({
      mode: 'sport',
      type: 'HIIT',
      date: '2026-05-22',
      calories: 320,
    }))

    expect(response.status).toBe(200)
    expect(insertedRows[0]).toMatchObject({
      name: 'HIIT',
      type: 'HIIT',
      custom_name: null,
      activity_points: 320,
    })
  })
})
