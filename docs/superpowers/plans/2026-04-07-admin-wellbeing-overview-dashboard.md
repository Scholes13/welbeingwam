# Admin Wellbeing Overview Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an overview-first admin wellbeing dashboard with global period filters, hybrid wellbeing scoring, secondary user drill-down, and explicit review plus QA closure.

**Architecture:** Keep the first iteration split into two clear layers: backend aggregation routes under `src/app/api/admin/wellbeing/*` backed by focused helpers in the existing `src/lib/` area, then frontend dashboard UI under `src/app/dashboard/admin/wellbeing/*` with one small branch added to the existing admin tab flow. Use the approved hybrid model from the spec: filtered metrics default to `30D`, support `7D`, `90D`, `Custom`, and `Lifetime`, and keep quest data secondary instead of letting it dominate wellbeing scoring.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SWR, Supabase, Vitest

---

## Chunk 1: `@coder_backend` Metric Foundation

### Task 1: Add the shared period filter and normalization helpers

**Files:**
- Create: `src/lib/wellbeing/period-filter.ts`
- Create: `src/lib/wellbeing/source-normalizer.ts`
- Create: `src/lib/wellbeing/period-filter.test.ts`
- Create: `src/lib/wellbeing/source-normalizer.test.ts`

- [ ] **Step 1: Write the failing period filter tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseWellbeingPeriod } from './period-filter'

describe('parseWellbeingPeriod', () => {
  it('defaults to 30D when no query params are provided', () => {
    const result = parseWellbeingPeriod(new URLSearchParams())
    expect(result.kind).toBe('30D')
  })

  it('builds a custom range when startDate and endDate are valid', () => {
    const result = parseWellbeingPeriod(new URLSearchParams({
      period: 'Custom',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    }))

    expect(result.kind).toBe('Custom')
    expect(result.start.toISOString()).toContain('2026-03-01')
  })
})
```

- [ ] **Step 2: Write the failing source normalization tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeCoverageScore, normalizeCountScore } from './source-normalizer'

describe('normalizeCoverageScore', () => {
  it('clamps ratios into a 0-100 score', () => {
    expect(normalizeCoverageScore(1.2)).toBe(100)
    expect(normalizeCoverageScore(0.45)).toBe(45)
  })
})

describe('normalizeCountScore', () => {
  it('caps action counts at the configured healthy target', () => {
    expect(normalizeCountScore({ count: 12, target: 8 })).toBe(100)
    expect(normalizeCountScore({ count: 2, target: 8 })).toBe(25)
  })
})
```

- [ ] **Step 3: Run the focused helper tests to verify they fail**

Run: `npx vitest run src/lib/wellbeing/period-filter.test.ts src/lib/wellbeing/source-normalizer.test.ts`

Expected: FAIL because the helper modules do not exist yet.

- [ ] **Step 4: Write the minimal period filter implementation**

```ts
export type WellbeingPeriodKind = '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'

export function parseWellbeingPeriod(searchParams: URLSearchParams) {
  const raw = searchParams.get('period') ?? '30D'
  if (raw === 'Lifetime') return { kind: 'Lifetime' as const, start: null, end: new Date() }
  if (raw === 'Custom') {
    const start = new Date(searchParams.get('startDate') ?? '')
    const end = new Date(searchParams.get('endDate') ?? '')
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new Error('Invalid custom wellbeing range')
    }
    return { kind: 'Custom' as const, start, end }
  }

  const days = raw === '7D' ? 7 : raw === '90D' ? 90 : 30
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  return { kind: raw as '7D' | '30D' | '90D', start, end }
}
```

- [ ] **Step 5: Write the minimal normalization implementation**

```ts
function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizeCoverageScore(ratio: number) {
  return clampPercentage(ratio * 100)
}

export function normalizeCountScore(input: { count: number; target: number }) {
  if (input.target <= 0) return 0
  return clampPercentage((input.count / input.target) * 100)
}
```

- [ ] **Step 6: Re-run the helper tests**

Run: `npx vitest run src/lib/wellbeing/period-filter.test.ts src/lib/wellbeing/source-normalizer.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the helper baseline**

```bash
git add src/lib/wellbeing/period-filter.ts src/lib/wellbeing/source-normalizer.ts src/lib/wellbeing/period-filter.test.ts src/lib/wellbeing/source-normalizer.test.ts
git commit -m "feat: add wellbeing period and normalization helpers"
```

### Task 2: Build the dimension mapper and hybrid score calculator

**Files:**
- Create: `src/lib/wellbeing/dimension-mapper.ts`
- Create: `src/lib/wellbeing/calculator.ts`
- Create: `src/lib/wellbeing/dimension-mapper.test.ts`
- Create: `src/lib/wellbeing/calculator.test.ts`

- [ ] **Step 1: Write the failing dimension mapping test**

```ts
it('prefers explicit quiz dimension scores before fallback activity dimensions', () => {
  const result = resolveDominantDimension({
    quizDimensions: { mental: 82, physical: 40 },
    activityDimensions: { physical: 70 },
    attendanceDimensions: { social: 20 },
  })

  expect(result.dimension).toBe('mental')
  expect(result.score).toBe(82)
})
```

- [ ] **Step 2: Write the failing hybrid calculator test**

```ts
it('combines quiz, sport, attendance, and other scores using the approved weights', () => {
  const result = calculateWellbeingIndex({
    quizScore: 80,
    sportScore: 60,
    attendanceScore: 50,
    otherScore: 40,
  })

  expect(result).toBe(64)
})
```

- [ ] **Step 3: Run the focused calculator tests to verify they fail**

Run: `npx vitest run src/lib/wellbeing/dimension-mapper.test.ts src/lib/wellbeing/calculator.test.ts`

Expected: FAIL because the mapper and calculator do not exist yet.

- [ ] **Step 4: Implement the mapper and calculator**

```ts
const WEIGHTS = {
  quiz: 0.4,
  sport: 0.25,
  attendance: 0.2,
  other: 0.15,
} as const

export function calculateWellbeingIndex(input: {
  quizScore: number
  sportScore: number
  attendanceScore: number
  otherScore: number
}) {
  return Math.round(
    input.quizScore * WEIGHTS.quiz +
      input.sportScore * WEIGHTS.sport +
      input.attendanceScore * WEIGHTS.attendance +
      input.otherScore * WEIGHTS.other,
  )
}
```

```ts
export function resolveDominantDimension(input: {
  quizDimensions: Record<string, number>
  activityDimensions: Record<string, number>
  attendanceDimensions: Record<string, number>
}) {
  const combined = new Map<string, number>()

  for (const [dimension, score] of Object.entries(input.quizDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.4)
  }
  for (const [dimension, score] of Object.entries(input.activityDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.35)
  }
  for (const [dimension, score] of Object.entries(input.attendanceDimensions)) {
    combined.set(dimension, (combined.get(dimension) ?? 0) + score * 0.25)
  }

  const winner = [...combined.entries()].sort((left, right) => right[1] - left[1])[0]
  return winner ? { dimension: winner[0], score: Math.round(winner[1]) } : { dimension: 'unknown', score: 0 }
}
```

- [ ] **Step 5: Re-run the focused calculator tests**

Run: `npx vitest run src/lib/wellbeing/dimension-mapper.test.ts src/lib/wellbeing/calculator.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the scoring helpers**

```bash
git add src/lib/wellbeing/dimension-mapper.ts src/lib/wellbeing/calculator.ts src/lib/wellbeing/dimension-mapper.test.ts src/lib/wellbeing/calculator.test.ts
git commit -m "feat: add wellbeing dimension and score helpers"
```

### Task 3: Create the reusable aggregation service for overview and user detail

**Files:**
- Create: `src/lib/wellbeing/index.ts`
- Create: `src/lib/wellbeing/types.ts`

- [ ] **Step 1: Define the shared service contracts**

```ts
export type WellbeingOverviewPayload = {
  meta: {
    appliedPeriod: '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'
    periodStart: string | null
    periodEnd: string | null
    priorPeriodStart: string | null
    priorPeriodEnd: string | null
    warnings: string[]
  }
  kpis: {
    activeUsersPercent: number
    averageWellbeingIndex: number
    quizCoveragePercent: number
    attendanceRatePercent: number
  }
}
```

- [ ] **Step 2: Implement the service orchestration shell**

Implementation notes:
- keep Supabase querying inside `src/lib/wellbeing/index.ts`,
- aggregate quiz from `survey_submissions`, `survey_answers`, and `survey_questions`,
- aggregate sport from `activities` where `mode = 'sport'` and `review_status` is not voided,
- aggregate attendance from `attendance` joined to `admin_activities`,
- compute per-user and population summaries without reading from frontend hooks.
- keep the new wellbeing code inside `src/lib/` as a normal subdirectory, not as a new repo-top-level directory.

- [ ] **Step 3: Add a small in-file TODO block for unmapped dimensions and out-of-v1 sources**

```ts
// TODO(v2): only add reward or quest signals after they have explicit dimension mapping and a validated wellbeing use case.
```

- [ ] **Step 4: Commit the service scaffolding**

```bash
git add src/lib/wellbeing/index.ts src/lib/wellbeing/types.ts
git commit -m "feat: scaffold wellbeing aggregation service"
```

## Chunk 2: `@coder_backend` Admin Routes

### Task 4: Implement the overview route contract with focused route tests

**Files:**
- Create: `src/app/api/admin/wellbeing/overview/route.ts`
- Create: `src/app/api/admin/wellbeing/overview/route.test.ts`

- [ ] **Step 1: Write the failing overview route test**

```ts
it('returns the overview payload with 30D as the default period', async () => {
  const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview'))
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.meta.appliedPeriod).toBe('30D')
  expect(body.kpis).toHaveProperty('activeUsersPercent')
  expect(body.operationalTables).toHaveProperty('mostActive')
})
```

- [ ] **Step 2: Add the failing unauthorized test**

```ts
it('rejects users without wellbeing read permission', async () => {
  verifyAdminPermissionMock.mockResolvedValue({ authorized: false })

  const response = await GET(new Request('http://localhost:3000/api/admin/wellbeing/overview'))
  expect(response.status).toBe(403)
})
```

- [ ] **Step 3: Run the overview route tests to verify they fail**

Run: `npx vitest run src/app/api/admin/wellbeing/overview/route.test.ts`

Expected: FAIL because the route does not exist yet.

- [ ] **Step 4: Implement the route using the existing permission contract**

```ts
export async function GET(request: Request) {
  const permission = 'view_activity'
  const { authorized, errorResponse } = await verifyAdminPermission(permission)
  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  const payload = await buildWellbeingOverview(new URL(request.url).searchParams)
  return NextResponse.json(payload)
}
```

- [ ] **Step 5: Record the v1 permission decision in the route test or implementation notes**

Implementation notes:
- v1 should explicitly piggyback on `view_activity` as the existing read-only analytics permission,
- if reviewer rejects that coupling, add `view_wellbeing` as a follow-up permission change instead of expanding scope silently.

- [ ] **Step 6: Re-run the overview route tests**

Run: `npx vitest run src/app/api/admin/wellbeing/overview/route.test.ts src/lib/wellbeing/period-filter.test.ts src/lib/wellbeing/source-normalizer.test.ts src/lib/wellbeing/dimension-mapper.test.ts src/lib/wellbeing/calculator.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the overview route**

```bash
git add src/app/api/admin/wellbeing/overview/route.ts src/app/api/admin/wellbeing/overview/route.test.ts src/lib/wellbeing
git commit -m "feat: add admin wellbeing overview route"
```

### Task 5: Implement the per-user drill-down route

**Files:**
- Create: `src/app/api/admin/wellbeing/users/[id]/route.ts`
- Create: `src/app/api/admin/wellbeing/users/[id]/route.test.ts`

- [ ] **Step 1: Write the failing user detail route test**

```ts
it('returns filtered user wellbeing detail and supporting evidence', async () => {
  const response = await GET(
    new Request('http://localhost:3000/api/admin/wellbeing/users/42?period=30D'),
    { params: Promise.resolve({ id: '42' }) } as never,
  )
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.filteredPeriod).toHaveProperty('wellbeingIndex')
  expect(body.supportingEvidence).toHaveProperty('attendanceRatio')
})
```

- [ ] **Step 2: Run the user detail route test to verify it fails**

Run: `npx vitest run src/app/api/admin/wellbeing/users/[id]/route.test.ts`

Expected: FAIL because the route does not exist yet.

- [ ] **Step 3: Implement the user detail route with the same permission handling**

```ts
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { authorized, errorResponse } = await verifyAdminPermission('view_activity')
  if (!authorized) {
    return NextResponse.json(errorResponse ?? { error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const payload = await buildWellbeingUserDetail({
    userId: id,
    searchParams: new URL(request.url).searchParams,
  })

  return NextResponse.json(payload)
}
```

- [ ] **Step 4: Re-run the detail route tests**

Run: `npx vitest run src/app/api/admin/wellbeing/users/[id]/route.test.ts src/app/api/admin/wellbeing/overview/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the detail route**

```bash
git add src/app/api/admin/wellbeing/users/[id]/route.ts src/app/api/admin/wellbeing/users/[id]/route.test.ts src/lib/wellbeing
git commit -m "feat: add admin wellbeing user detail route"
```

## Chunk 3: `@coder_frontend` Overview-First Admin Surface

### Task 6: Add typed UI helpers, filter state, and admin navigation wiring

**Files:**
- Create: `src/app/dashboard/admin/wellbeing/types.ts`
- Create: `src/app/dashboard/admin/wellbeing/utils.ts`
- Create: `src/app/dashboard/admin/wellbeing/utils.test.ts`
- Create: `src/app/dashboard/admin/wellbeing/components/PeriodFilter.test.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/KPICards.test.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/OperationalTables.test.tsx`
- Modify: `src/app/dashboard/admin/components/AdminTabs.tsx`
- Modify: `src/app/dashboard/admin/components/AdminSidebar.tsx`
- Modify: `src/app/dashboard/admin/components/adminLayout.ts`
- Modify: `src/app/dashboard/admin/components/adminLayout.test.ts`

- [ ] **Step 1: Write the failing wellbeing utility tests**

```ts
import { describe, expect, it } from 'vitest'
import { getDefaultWellbeingPeriod, formatTrendDelta } from './utils'

describe('getDefaultWellbeingPeriod', () => {
  it('defaults to 30D', () => {
    expect(getDefaultWellbeingPeriod()).toBe('30D')
  })
})

describe('formatTrendDelta', () => {
  it('formats positive and negative changes for the KPI row', () => {
    expect(formatTrendDelta(12)).toBe('+12%')
    expect(formatTrendDelta(-7)).toBe('-7%')
  })
})
```

- [ ] **Step 2: Run the wellbeing utility tests to verify they fail**

Run: `npx vitest run src/app/dashboard/admin/wellbeing/utils.test.ts src/app/dashboard/admin/components/adminLayout.test.ts`

Expected: FAIL because the wellbeing helper module and tab wiring do not exist yet.

- [ ] **Step 3: Implement the typed helper surface**

```ts
export type WellbeingPeriod = '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'

export function getDefaultWellbeingPeriod(): WellbeingPeriod {
  return '30D'
}

export function formatTrendDelta(value: number) {
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`
}
```

- [ ] **Step 4: Add the `wellbeing` tab and sidebar metadata**

Implementation notes:
- extend the `AdminTab` union with `'wellbeing'`,
- add a label such as `Wellbeing`,
- update page meta text in `adminLayout.ts`,
- update any tab-order tests in `adminLayout.test.ts`.

- [ ] **Step 5: Add lightweight component rendering tests without new dependencies**

Implementation notes:
- use `renderToStaticMarkup` from `react-dom/server` for presentational coverage,
- verify the default `30D` button label, KPI labels, empty-state copy, and row drill-down affordances,
- do not add `@testing-library/react` or any new dependency without explicit approval.

- [ ] **Step 6: Re-run the utility and admin layout tests**

Run: `npx vitest run src/app/dashboard/admin/wellbeing/utils.test.ts src/app/dashboard/admin/wellbeing/components/PeriodFilter.test.tsx src/app/dashboard/admin/wellbeing/components/KPICards.test.tsx src/app/dashboard/admin/wellbeing/components/OperationalTables.test.tsx src/app/dashboard/admin/components/adminLayout.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the navigation wiring**

```bash
git add src/app/dashboard/admin/wellbeing/types.ts src/app/dashboard/admin/wellbeing/utils.ts src/app/dashboard/admin/wellbeing/utils.test.ts src/app/dashboard/admin/wellbeing/components/PeriodFilter.test.tsx src/app/dashboard/admin/wellbeing/components/KPICards.test.tsx src/app/dashboard/admin/wellbeing/components/OperationalTables.test.tsx src/app/dashboard/admin/components/AdminTabs.tsx src/app/dashboard/admin/components/AdminSidebar.tsx src/app/dashboard/admin/components/adminLayout.ts src/app/dashboard/admin/components/adminLayout.test.ts
git commit -m "feat: add admin wellbeing navigation and ui helpers"
```

### Task 7: Build the overview-first wellbeing dashboard surface

**Files:**
- Create: `src/app/dashboard/admin/wellbeing/hooks/useWellbeingOverview.ts`
- Create: `src/app/dashboard/admin/wellbeing/components/WellbeingOverview.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/PeriodFilter.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/KPICards.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/DimensionDistribution.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/TrendChart.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/AttentionPanel.tsx`
- Create: `src/app/dashboard/admin/wellbeing/components/OperationalTables.tsx`
- Modify: `src/app/dashboard/admin/page.tsx`

- [ ] **Step 1: Create the typed fetch hook**

```ts
import useSWR from 'swr'
import { fetchJson } from '@/lib/fetch-json'

export function useWellbeingOverview(period: string, customRange?: { startDate: string; endDate: string }) {
  const params = new URLSearchParams({ period })
  if (customRange?.startDate) params.set('startDate', customRange.startDate)
  if (customRange?.endDate) params.set('endDate', customRange.endDate)

  return useSWR(`/api/admin/wellbeing/overview?${params.toString()}`, fetchJson)
}
```

- [ ] **Step 2: Render the global period filter and KPI row**

Implementation notes:
- keep `30D` selected by default,
- use existing Tailwind patterns from admin surfaces,
- do not add a new chart dependency,
- render charts with simple bars or inline SVG so the repo stays dependency-stable.

- [ ] **Step 3: Render the core insight area**

Implementation notes:
- `DimensionDistribution.tsx` should show dominant-dimension population breakdown,
- `TrendChart.tsx` should show current vs prior-period movement,
- `AttentionPanel.tsx` should show no-quiz, low-attendance, falling-sport, inactive counts.

- [ ] **Step 4: Render the operational summary tables**

Implementation notes:
- the overview page should keep summary tables compact,
- each row should expose a click target for user drill-down,
- show explicit empty states rather than hiding a table silently.

- [ ] **Step 5: Integrate the wellbeing tab into the admin page**

Implementation notes:
- keep the change to `src/app/dashboard/admin/page.tsx` minimal,
- delegate the wellbeing branch to the new `WellbeingOverview` surface instead of inlining UI into the 4700-line page,
- do not introduce a parallel admin routing model for v1.

```ts
if (activeTab === 'wellbeing') {
  return (
    <WellbeingOverview
      permissions={myPermissions}
    />
  )
}
```

- [ ] **Step 6: Run the build as the frontend contract check**

Run: `npm run build`

Expected: PASS and the new wellbeing tab compiles without adding new dependencies.

- [ ] **Step 7: Commit the overview UI**

```bash
git add src/app/dashboard/admin/wellbeing src/app/dashboard/admin/page.tsx
git commit -m "feat: add admin wellbeing overview dashboard"
```

### Task 8: Add user drill-down and degraded-state handling

**Files:**
- Create: `src/app/dashboard/admin/wellbeing/hooks/useWellbeingUser.ts`
- Create: `src/app/dashboard/admin/wellbeing/components/UserDrilldown.tsx`
- Modify: `src/app/dashboard/admin/wellbeing/components/WellbeingOverview.tsx`

- [ ] **Step 1: Wire the user detail hook**

```ts
export function useWellbeingUser(userId: string | null, period: string, customRange?: { startDate: string; endDate: string }) {
  const params = new URLSearchParams({ period })
  if (customRange?.startDate) params.set('startDate', customRange.startDate)
  if (customRange?.endDate) params.set('endDate', customRange.endDate)

  const key = userId ? `/api/admin/wellbeing/users/${userId}?${params.toString()}` : null
  return useSWR(key, fetchJson)
}
```

- [ ] **Step 2: Implement the detail drawer or modal**

Implementation notes:
- show filtered wellbeing index,
- show dominant dimension,
- show source contribution breakdown,
- show flags and supporting evidence,
- allow closing without a full page navigation.

- [ ] **Step 3: Add degraded and partial-data states**

Implementation notes:
- if quiz coverage is sparse, show a warning badge instead of zeroing the dashboard,
- if one block fails, render a visible degraded state inside that block,
- if custom dates are invalid, prevent the request and show validation feedback.

- [ ] **Step 4: Run the build and targeted utility tests again**

Run: `npx vitest run src/app/dashboard/admin/wellbeing/utils.test.ts`
Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit the drill-down and resilience pass**

```bash
git add src/app/dashboard/admin/wellbeing
git commit -m "feat: add wellbeing drilldown and degraded states"
```

## Chunk 4: `@reviewer` And `@qa` Closure

### Task 9: `@reviewer` standards and contract review

**Files:**
- Create: `tests/fixtures/wellbeing-smoke.sql`
- Modify: `docs/exec_plans.md`

- [ ] **Step 1: Review the backend contract against the approved spec**

Check:
- `30D` is the default period,
- `Lifetime` is supported but clearly labeled,
- quest data is not the primary wellbeing driver,
- overview-first layout remains the primary landing experience,
- user drill-down stays secondary.

- [ ] **Step 2: Review architecture boundaries**

Check:
- aggregation logic lives in `src/lib/wellbeing/*`,
- route files stay thin,
- frontend rendering is kept out of backend helpers,
- `src/app/dashboard/admin/page.tsx` was not expanded irresponsibly.

- [ ] **Step 3: Review failure and degraded states**

Check:
- sparse quiz data is surfaced explicitly,
- invalid custom ranges fail clearly,
- one failing source does not silently fake healthy dashboard data.

- [ ] **Step 4: Record review notes in `docs/exec_plans.md` if new risks are found**

```bash
git add docs/exec_plans.md
git commit -m "docs: record wellbeing dashboard review notes"
```

### Task 10: `@qa` verification and reproducible validation notes

**Files:**
- Modify: `docs/exec_plans.md`

- [ ] **Step 1: Run the focused backend tests**

Run: `npx vitest run src/lib/wellbeing/period-filter.test.ts src/lib/wellbeing/source-normalizer.test.ts src/lib/wellbeing/dimension-mapper.test.ts src/lib/wellbeing/calculator.test.ts src/app/api/admin/wellbeing/overview/route.test.ts src/app/api/admin/wellbeing/users/[id]/route.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the build verification**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Create the reproducible smoke fixture**

Create `tests/fixtures/wellbeing-smoke.sql` with deterministic inserts or upserts for:
- one user with recent quiz coverage,
- one user with attendance but no quiz,
- one user with a measurable sport decline versus the prior period,
- one mostly inactive user.

- [ ] **Step 4: Perform manual admin smoke checks**

Preparation:
- apply `tests/fixtures/wellbeing-smoke.sql` to the local or linked Supabase database before smoke testing,
- include at least:
  - one user with recent quiz coverage,
  - one user with attendance but no quiz,
  - one user with sport activity drop between prior and current period,
  - one mostly inactive user.

Check:
- wellbeing tab opens from admin navigation,
- `30D` loads by default,
- `7D`, `90D`, `Custom`, and `Lifetime` all switch cleanly,
- KPI cards update with the active filter,
- operational tables render empty states safely,
- clicking a user opens the drill-down and shows supporting evidence.

- [ ] **Step 5: Perform degraded-state smoke checks**

Check:
- no quiz or sparse quiz data shows a warning state,
- invalid custom range blocks the request cleanly,
- route failure surfaces a visible error block instead of a blank page.

- [ ] **Step 6: Record QA evidence in `docs/exec_plans.md`**

```bash
git add docs/exec_plans.md
git commit -m "docs: record wellbeing dashboard qa evidence"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-07-admin-wellbeing-overview-dashboard.md`. Ready to execute?
