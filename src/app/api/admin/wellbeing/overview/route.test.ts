import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

vi.mock('@/utils/auth', () => ({
  verifyAdminPermission: vi.fn(),
}))

vi.mock('@/lib/wellbeing', () => ({
  buildWellbeingOverview: vi.fn(),
}))

const { verifyAdminPermission } = await import('@/utils/auth')
const { buildWellbeingOverview } = await import('@/lib/wellbeing')

describe('GET /api/admin/wellbeing/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the overview payload with 30D as the default period', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({ authorized: true, userId: '1' })
    vi.mocked(buildWellbeingOverview).mockResolvedValue({
      meta: {
        appliedPeriod: '30D',
        periodStart: '2026-03-08T00:00:00.000Z',
        periodEnd: '2026-04-07T00:00:00.000Z',
        priorPeriodStart: null,
        priorPeriodEnd: null,
        warnings: [],
      },
      kpis: {
        activeUsersPercent: 75,
        averageWellbeingIndex: 68,
        averageWellbeingIndexPrevious: 0,
        averageWellbeingIndexDelta: 68,
        quizCoveragePercent: 60,
        attendanceRatePercent: 55,
      },
      dimensionScores: [],
      monthlyTrend: [],
      insights: [],
      recommendations: [],
      dimensionDistribution: [],
      attentionCounts: {
        noRecentQuiz: 5,
        lowAttendance: 3,
        fallingSport: 2,
        inactive: 1,
      },
      operationalTables: {
        mostActive: [],
        highestAttendance: [],
        biggestDrop: [],
      },
    })

    const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.meta.appliedPeriod).toBe('30D')
    expect(body.kpis).toHaveProperty('activeUsersPercent')
    expect(body.operationalTables).toHaveProperty('mostActive')
  })

  it('rejects users without wellbeing read permission', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({
      authorized: false,
      errorResponse: { error: 'Forbidden: Insufficient permissions' },
    })

    const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview'))
    expect(response.status).toBe(403)
  })

  it('passes query params to buildWellbeingOverview', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({ authorized: true, userId: '1' })
    vi.mocked(buildWellbeingOverview).mockResolvedValue({
      meta: {
        appliedPeriod: '7D',
        periodStart: '2026-04-01T00:00:00.000Z',
        periodEnd: '2026-04-07T00:00:00.000Z',
        priorPeriodStart: null,
        priorPeriodEnd: null,
        warnings: [],
      },
      kpis: {
        activeUsersPercent: 80,
        averageWellbeingIndex: 70,
        averageWellbeingIndexPrevious: 0,
        averageWellbeingIndexDelta: 70,
        quizCoveragePercent: 65,
        attendanceRatePercent: 60,
      },
      dimensionScores: [],
      monthlyTrend: [],
      insights: [],
      recommendations: [],
      dimensionDistribution: [],
      attentionCounts: {
        noRecentQuiz: 4,
        lowAttendance: 2,
        fallingSport: 1,
        inactive: 0,
      },
      operationalTables: {
        mostActive: [],
        highestAttendance: [],
        biggestDrop: [],
      },
    })

    const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview?period=7D'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.meta.appliedPeriod).toBe('7D')
    expect(buildWellbeingOverview).toHaveBeenCalledWith(expect.any(URLSearchParams))
  })

  it('returns 400 when the requested range is invalid', async () => {
    vi.mocked(verifyAdminPermission).mockResolvedValue({ authorized: true, userId: '1' })
    vi.mocked(buildWellbeingOverview).mockRejectedValue(new Error('Invalid custom wellbeing range'))

    const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview?period=Custom'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid custom wellbeing range' })
  })
})
