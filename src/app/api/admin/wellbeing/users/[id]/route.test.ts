import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/utils/auth', () => ({
  verifyAdminPermission: vi.fn(),
}))

vi.mock('@/lib/wellbeing', () => ({
  buildWellbeingUserDetail: vi.fn(),
}))

const { verifyAdminPermission } = await import('@/utils/auth')
const { buildWellbeingUserDetail } = await import('@/lib/wellbeing')

describe('GET /api/admin/wellbeing/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns filtered user wellbeing detail and supporting evidence', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({ authorized: true, userId: '1' })
    vi.mocked(buildWellbeingUserDetail).mockResolvedValue({
      userId: 42,
      username: 'testuser',
      filteredPeriod: {
        wellbeingIndex: 72,
        dominantDimension: 'physical',
        sourceContributions: {
          quiz: 60,
          sport: 80,
          attendance: 70,
          other: 0,
        },
      },
      supportingEvidence: {
        quizSubmissions: 3,
        sportActivities: 8,
        attendanceRatio: 0.7,
        flags: [],
      },
      timeSeries: [],
    })

    const response = await GET(
      new Request('http://localhost:3000/api/admin/wellbeing/users/42?period=30D'),
      { params: Promise.resolve({ id: '42' }) } as never,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.userId).toBe(42)
    expect(body.filteredPeriod).toHaveProperty('wellbeingIndex')
    expect(body.supportingEvidence).toHaveProperty('attendanceRatio')
  })

  it('rejects users without permission', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({
      authorized: false,
      errorResponse: { error: 'Forbidden: Insufficient permissions' },
    })

    const response = await GET(
      new Request('http://localhost:3000/api/admin/wellbeing/users/42'),
      { params: Promise.resolve({ id: '42' }) } as never,
    )

    expect(response.status).toBe(403)
  })

  it('passes userId and searchParams to buildWellbeingUserDetail', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({ authorized: true, userId: '1' })
    vi.mocked(buildWellbeingUserDetail).mockResolvedValue({
      userId: 99,
      username: 'anotheruser',
      filteredPeriod: {
        wellbeingIndex: 55,
        dominantDimension: 'mental',
        sourceContributions: {
          quiz: 70,
          sport: 40,
          attendance: 50,
          other: 0,
        },
      },
      supportingEvidence: {
        quizSubmissions: 4,
        sportActivities: 2,
        attendanceRatio: 0.5,
        flags: ['Low sport activity'],
      },
      timeSeries: [],
    })

    const response = await GET(
      new Request('http://localhost:3000/api/admin/wellbeing/users/99?period=7D'),
      { params: Promise.resolve({ id: '99' }) } as never,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.userId).toBe(99)
    expect(buildWellbeingUserDetail).toHaveBeenCalledWith({
      userId: '99',
      searchParams: expect.any(URLSearchParams),
    })
  })
})