# Admin Wellbeing Overview Dashboard Design

**Date:** 2026-04-07
**Status:** approved in chat, pending implementation plan

## Goal
Add an admin dashboard that gives an overview of user wellbeing and engagement trends, with a standard dashboard-first layout that helps admins quickly understand who is active, which wellbeing dimensions dominate, and which users may need attention.

## Confirmed Constraints
- The dashboard should feel like a normal admin overview page, not a user list-first intelligence console.
- The primary data sources should be quiz results, sport activity, attendance, and other non-quest engagement signals.
- Quest data should not be the main driver of the wellbeing index.
- The dashboard must support global period filters: `7D`, `30D`, `90D`, `Custom`, and `Lifetime`.
- The default period should be `30D`.
- Lifetime support is required, but it should not be the default operational view.
- Admins still need drill-down into an individual user, but that is a secondary action from the overview.

## Repository And Product Evidence
- The current product already includes an admin surface under `src/app/dashboard/admin/page.tsx`.
- The admin area already manages attendance-heavy activity data through `src/app/api/admin/activities/route.ts` and `src/app/api/admin/activities/detail/route.ts`.
- Manual and synced sport sessions already exist through `src/app/api/admin/sport-sessions/route.ts` and `src/lib/strava/sync.ts`.
- The codebase already has survey-backed infrastructure that can support quiz-style wellbeing inputs through `src/app/api/admin/surveys/*`, `src/app/api/surveys/[id]/route.ts`, and `src/app/api/surveys/submit/route.ts`.
- Dimension-based scoring already exists in the product model, including `dimensions`, leaderboard dimension aggregation, and streak events.

## Recommended Approach
Build a new admin wellbeing dashboard as an overview-first analytics surface with a global period filter, top-level KPI cards, dimension distribution visuals, attention-needed panels, and operational summary tables. The dashboard should calculate a hybrid wellbeing index from quiz, sport activity, attendance, and other non-quest engagement sources, while keeping quest-derived scores secondary or informational only.

The default dashboard should open in `30D` mode. Admins can switch the same widgets to `7D`, `90D`, `Custom`, or `Lifetime`. Each filtered view should show both the filtered score and a trend comparison against the prior equivalent period where possible. Lifetime metrics should remain visible only as supporting context so they do not hide recent drops in behavior.

## Why This Approach
- It matches the user's request for a familiar dashboard experience.
- It lets admins answer high-level questions quickly before drilling into a person.
- It uses data already present in the repository instead of inventing a separate measurement system from scratch.
- It preserves room for per-user drill-down without making the first screen feel dense or investigative.
- It avoids over-weighting quests, which the user explicitly called out as insufficient.

## Alternatives Considered

### User-first intelligence console
Lead with a searchable user list and make overview charts secondary.

Why not recommended:
- it feels more like case investigation than a dashboard,
- it slows down population-level monitoring,
- it does not match the user's preferred admin experience.

### Lifetime-only wellbeing ranking
Use all historical data as the main score and add no explicit recent-period default.

Why not recommended:
- it hides recent behavior changes,
- it favors long-tenured users heavily,
- it makes operational follow-up harder when an active user starts dropping off.

### Quest-heavy engagement scoring
Treat quest completion as the central engagement signal.

Why not recommended:
- it conflicts with the user's request,
- it risks misrepresenting wellbeing when user behavior happens outside quests,
- it would underuse richer data already available in attendance, sport, and quiz flows.

## Dashboard Structure

### Global Controls
- One global period filter at the top of the page:
  - `7D`
  - `30D`
  - `90D`
  - `Custom`
  - `Lifetime`
- Default selection: `30D`
- Optional secondary filter later: department, team, cohort, or activity type if that metadata exists reliably.

### Section 1: KPI Row
Top cards should answer the fastest admin questions:
- `Active Users %`
- `Average Wellbeing Index`
- `Quiz Coverage %`
- `Attendance Rate %`

Optional later KPI cards if the space still feels clean:
- `Sport Participation %`
- `Users At Risk`

### Section 2: Core Insight Area
The center of the dashboard should include:
- a dimension distribution chart showing which users are currently dominated by `Physical`, `Mental`, `Social`, or other supported dimensions,
- a trend chart showing filtered-period movement compared with the previous equivalent period,
- an attention panel showing counts for:
  - no recent quiz,
  - low attendance,
  - falling sport activity,
  - inactive users in the filtered window.

### Section 3: Operational Summary Tables
The lower area should contain compact tables for quick action:
- most active users,
- highest attendance consistency,
- biggest engagement drop,
- users overly concentrated in one dimension,
- users missing recent quiz coverage.

### Section 4: Secondary Drill-down
Admins can click a user or table row to open a user detail view or drawer showing:
- current filtered wellbeing index,
- dominant dimension,
- quiz contribution summary,
- sport activity trend,
- attendance trend,
- supporting notes about why the user is flagged.

The drill-down should support action, but it should not replace the overview-first landing page.

## Metric Design

### Time Window Model
- All primary widgets should be derived from the active time filter.
- `30D` is the default operational view.
- `Lifetime` is allowed, but it should be clearly labeled and should not silently replace recent context.
- Where possible, show `trend vs previous period` beside the filtered score.

### Wellbeing Index
The wellbeing index should be a normalized `0-100` score, not raw accumulated points.

Initial weighting:
- `Quiz contribution`: 40%
- `Sport activity contribution`: 25%
- `Attendance contribution`: 20%
- `Other engagement contribution`: 15%

Rationale:
- Quiz is the strongest intentional self-report signal.
- Sport activity and attendance represent actual behavior.
- Other engagement provides breadth without letting low-signal actions dominate.

### Dominant Dimension
The dashboard should separately calculate which dimension a user currently leans toward, for example `Physical`, `Mental`, or `Social`.

This should not be inferred only from a single source. It should come from the combination of:
- quiz answers mapped to dimensions,
- sport activities or activity types already tied to a dimension,
- attendance or engagement events that can be mapped safely to a dimension.

### Active Percentage
Active percentage should not mean "how much score a user has." It should mean "how many users had at least one meaningful action in the selected period."

Meaningful actions can include:
- submitting the wellbeing quiz,
- attending an event,
- logging or syncing a sport activity,
- completing another supported non-quest wellbeing action.

For user detail, a separate `personal activity rate` can represent how consistently that user engaged during the filtered period.

### Lifetime Companion Metrics
When the active filter is not `Lifetime`, the dashboard may still show a small lifetime companion badge or comparison summary such as:
- lifetime engagement band,
- lifetime total participations,
- lifetime dominant dimension stability.

These should remain secondary so the filtered operational story stays clear.

## Data Sources And Contracts

### Primary Sources
- Quiz inputs should reuse the current survey-backed tables and APIs where possible, but the admin and user-facing language can call them `quiz` or `wellbeing quiz`.
- Sport activity should reuse the existing `activities` and `sport sessions` data, including manual and Strava-synced entries when they are valid for admin reporting.
- Attendance should reuse `admin_activities`, `attendance`, and existing attendance ratio logic.
- Other engagement should reuse existing non-quest actions only where the data is reliable and semantically meaningful.

### Secondary Sources
- Quest data can appear as a supporting signal or comparison, but it should not be the core index driver.
- Reward claims may be useful as a weak engagement indicator only if they reflect active participation rather than passive redemption.

### Recommended API Shape
Prefer local aggregate read APIs dedicated to the dashboard instead of composing this page directly from many existing endpoints.

Suggested endpoints:
- `GET /api/admin/wellbeing/overview`
- `GET /api/admin/wellbeing/users/[id]`

The overview route should return:
- applied filter metadata,
- KPI cards,
- dimension distribution,
- trend blocks,
- attention counts,
- operational summary tables.

The user detail route should return:
- user summary,
- filtered wellbeing index,
- source contribution breakdown,
- time-series trend data,
- flags and supporting evidence.

## Empty States And Error Handling
- If quiz data is not yet available, show a clear partial-data state instead of zeroing the whole dashboard.
- If one source fails, the page should surface which block is degraded rather than silently pretending all metrics are healthy.
- Lifetime and filtered views should share the same validation and labeling so the admin understands which period they are looking at.
- Custom range validation should block invalid date windows and large accidental queries.
- If a widget is unavailable because the selected filter has insufficient data, show a human-readable empty state rather than hiding the section abruptly.

## Testing And Verification Design
- Add focused tests for index calculation and weighting behavior.
- Add focused tests for period filter handling, especially `Lifetime` and custom ranges.
- Add focused tests for graceful degradation when quiz data is missing.
- Add focused tests for the overview route contract and user detail route contract.
- Add frontend tests for:
  - default `30D` selection,
  - filter switching,
  - KPI rendering,
  - degraded and empty states,
  - drill-down entry from overview tables.
- Run `npm test` for touched behavior and `npm run build` before completion.

## Rollout Sequence
1. Define the wellbeing metric helpers and source-normalization utilities.
2. Build a dedicated admin overview API that aggregates filtered KPI and summary data.
3. Build a dedicated user detail API for drill-down.
4. Add the overview-first admin dashboard page or tab entry.
5. Add the period filter controls and wire them into all widgets.
6. Add degraded, partial-data, and empty states.
7. Verify route contracts, frontend rendering, and filtered metric correctness.

## Operational Risks
- Quiz coverage may be sparse at launch, so the dashboard must explain partial confidence instead of overstating precision.
- Some engagement sources may not map cleanly to a wellbeing dimension and should stay out of the dominant-dimension logic until the mapping is explicit.
- Lifetime mode can still mislead if it is shown without recent-period context, so labels and trend comparisons matter.
- A single monolithic page component would be hard to maintain; the implementation should prefer a dedicated overview route plus smaller dashboard components.

## Out Of Scope
- Replacing the existing admin panel architecture wholesale.
- Re-scoring the public leaderboard to match the wellbeing index.
- Making quests the core source of wellbeing.
- Building predictive or AI-generated wellness recommendations in the first iteration.
