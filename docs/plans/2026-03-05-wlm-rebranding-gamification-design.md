# Werkudara Life Mode (WLM) — Rebranding & Gamification Design

**Date**: 2026-03-05
**Status**: Approved
**Tagline**: Balance Within. Impact Beyond.
**Theme 2026**: Scaling Impact

---

## 1. Overview

Rebrand WAM25 → **Werkudara Life Mode (WLM)** dan upgrade gamification system dengan 6 dimensi wellness, quest templates, activity-linked quests, streak events, dan photo verification.

**Positioning**: WLM adalah mode aktif Werkudara untuk memastikan fondasi karakter, disiplin, dan energi sebelum Scaling Impact 2026.

---

## 2. Rebranding

### Identity Changes

| Aspect | Before | After |
|--------|--------|-------|
| App Name | WAM25 | Werkudara Life Mode |
| Abbreviation | WAM | WLM |
| Tagline | "Your personal wellness companion" | "Balance Within. Impact Beyond." |
| Footer | "ScalingImpact v1.0 Beta" | "WLM v2.0 — Scaling Impact 2026" |

### Visual System

- **Primary Color**: `#FC4C02` (Orange) — tetap
- **Theme**: Dark mode — tetap
- **Font**: Geist Sans — tetap
- **Mono-brand approach**: Satu palette orange dengan variasi shade/opacity untuk pembeda antar dimensi. Pembeda utama via icon dan typography, bukan warna berbeda.

### Files to Update

- `package.json` — name, version
- `src/app/layout.tsx` — metadata title, description, appleWebApp.title
- `src/app/page.tsx` & `LoginForm.tsx` — login branding
- `src/components/mobile/BottomNav.tsx` — nav labels
- `src/app/profile/page.tsx` — footer text
- All references to "WAM25" across codebase

---

## 3. Six Dimensions System

### Approach: Quest Category Extension

Extend existing quest system by adding `dimension` categorization. Minimal database changes, leverages mature quest infrastructure.

### Dimensions

| # | Dimension | Display Name | Award Title | Activities |
|---|-----------|-------------|-------------|------------|
| 1 | physical | Body Upgrade Mode | Strong Mode Champion of The Month | Langkah harian, latihan, peregangan, hidrasi |
| 2 | emotional | No Drama Zone | Most Positive Energy of The Month | Pernapasan, apresiasi, gratitude, refleksi |
| 3 | mental | Brain Gym | Brain Star of The Month | Prioritas, belajar, insight, konsep baru |
| 4 | social | Good Energy Circle | Team Connector of The Month | Komunikasi sopan, apresiasi rekan, bantu rekan |
| 5 | spiritual | Inner Reset | Silent Power of The Month | Hening, meditasi, ibadah, aksi kebaikan |
| 6 | professional | Level Up Career | Ownership Champion of The Month | Tepat waktu, deadline, inovasi, kerapihan |

### Database: `dimensions` table

```sql
CREATE TABLE dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  award_title TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Seed data
INSERT INTO dimensions (name, display_name, award_title, icon, sort_order) VALUES
  ('physical', 'Body Upgrade Mode', 'Strong Mode Champion of The Month', 'activity', 1),
  ('emotional', 'No Drama Zone', 'Most Positive Energy of The Month', 'heart', 2),
  ('mental', 'Brain Gym', 'Brain Star of The Month', 'brain', 3),
  ('social', 'Good Energy Circle', 'Team Connector of The Month', 'users', 4),
  ('spiritual', 'Inner Reset', 'Silent Power of The Month', 'sparkles', 5),
  ('professional', 'Level Up Career', 'Ownership Champion of The Month', 'briefcase', 6);
```

### Extend `quests` table

```sql
ALTER TABLE quests ADD COLUMN dimension_id UUID REFERENCES dimensions(id);
```

### Extend `activity_types` table

```sql
ALTER TABLE activity_types ADD COLUMN dimension_id UUID REFERENCES dimensions(id);
```

When user scans attendance for an activity, points auto-route to the activity type's dimension.

---

## 4. Quest Template System

### Problem

Admin tidak selalu sempat input quest harian. Butuh auto-recurring quests.

### Solution: Quest Templates

```sql
CREATE TABLE quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  dimension_id UUID REFERENCES dimensions(id),
  points INT NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'none',
  requires_photo BOOLEAN DEFAULT false,
  recurrence TEXT NOT NULL DEFAULT 'daily',  -- 'daily', 'weekly', 'monthly'
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled', 'activity_linked'
  linked_activity_type_id UUID REFERENCES activity_types(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
```

### Recurrence Types

| Type | Behavior | Example |
|------|----------|---------|
| `daily` | Auto-generate quest setiap hari | "Jalan 5000 langkah" |
| `weekly` | Auto-generate quest setiap Senin | "Olahraga 3x minggu ini" |
| `monthly` | Auto-generate quest awal bulan | "Submit monthly report" |

### Trigger Types

| Type | Behavior | Example |
|------|----------|---------|
| `scheduled` | Auto recur berdasarkan recurrence | Daily/weekly templates |
| `activity_linked` | Generate saat activity dengan type tertentu dibuat | "Menangkan 3 match badminton" saat activity badminton di-publish |

### Quest Generation Flow

```
CRON (daily, midnight):
  1. Fetch active templates where trigger_type = 'scheduled'
  2. Check recurrence: daily → generate, weekly → if Monday, monthly → if 1st
  3. Create quest from template (title, description, dimension, points, verification)
  4. Set deadline based on recurrence (end of day/week/month)

Activity Publish Trigger:
  1. Admin publishes activity with type_id
  2. Fetch templates where trigger_type = 'activity_linked' AND linked_activity_type_id = type_id
  3. Generate quests linked to that activity period
```

### Quest Types Summary

| Type | Trigger | Source |
|------|---------|--------|
| Template Daily | Auto setiap hari | quest_templates (scheduled) |
| Template Weekly | Auto setiap minggu | quest_templates (scheduled) |
| Activity-Linked | Saat activity dibuat | quest_templates (activity_linked) |
| One-off Manual | Admin buat manual | quests table directly |

---

## 5. Photo Verification

### Problem

Some quests need proof beyond self-report. Supabase Storage supports image upload.

### Database Changes

```sql
ALTER TABLE quests ADD COLUMN requires_photo BOOLEAN DEFAULT false;
ALTER TABLE user_quests ADD COLUMN photo_url TEXT;
ALTER TABLE user_quests ADD COLUMN verification_note TEXT;
```

### Supabase Storage

- **Bucket**: `quest-proofs` (private)
- **Path**: `{user_id}/{quest_id}/{timestamp}.jpg`
- **Max size**: 5MB
- **Formats**: JPEG, PNG, WebP

### Claim Flow

```
Quest requires_photo = false:
  → Existing claim flow (langsung)

Quest requires_photo = true:
  → Modal: upload foto + optional note
  → Upload to Supabase Storage
  → Save photo_url to user_quests
  → Status = 'approved' (auto) or 'pending' (admin review)
```

### Verification Types (Complete)

| Type | Method | Photo |
|------|--------|-------|
| `none` | Langsung claim | Optional |
| `self_report` | User tulis catatan | Optional |
| `photo_proof` | Wajib upload foto | **Required** |
| `step_count` | Auto-check steps data | No |
| `activity_attendance` | Auto-check attendance | No |
| `instagram_username` | Check Instagram profile | No |
| `positive_message` | Check messages + AI sentiment | No |

---

## 6. Streak Events (Admin-Managed)

### Problem

Need incentive for consistency, but streak should be controllable by admin (like events).

### Database

```sql
CREATE TABLE streak_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  dimension_id UUID REFERENCES dimensions(id),  -- NULL = all dimensions
  multiplier_tiers JSONB NOT NULL DEFAULT '[
    {"days": 3, "multiplier": 1.25},
    {"days": 7, "multiplier": 1.5},
    {"days": 14, "multiplier": 1.75},
    {"days": 30, "multiplier": 2.0}
  ]',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  streak_event_id UUID REFERENCES streak_events(id) NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, streak_event_id, dimension_id)
);
```

### Multiplier Tiers (Default)

| Days | Multiplier | Label |
|------|-----------|-------|
| 1-2 | 1.0x | Normal |
| 3-6 | 1.25x | +25% bonus |
| 7-13 | 1.5x | Weekly Streak |
| 14-29 | 1.75x | Bi-weekly Streak |
| 30+ | 2.0x | Monthly Streak (max) |

### Admin Controls

- Create/edit/delete streak events
- Set period (start/end date)
- Activate/deactivate anytime
- Target specific dimension or all
- Customize multiplier tiers per event

### Streak Logic

```
User claims quest in dimension X during active streak event:
  1. Check if streak event covers dimension X
  2. Check last_completed_date:
     - Yesterday → current_streak += 1
     - Today (already counted) → no change
     - Older → reset current_streak = 1
  3. Lookup multiplier from tiers based on current_streak
  4. finalPoints = questPoints × multiplier
  5. Update longest_streak if current > longest
```

---

## 7. Monthly Awards System

### Database

```sql
CREATE TABLE monthly_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) NOT NULL,
  period TEXT NOT NULL,            -- '2026-03'
  award_title TEXT NOT NULL,
  points_earned INT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(dimension_id, period)
);
```

### Flow

1. Leaderboard per dimensi = sum(quest_points + activity_attendance_points) per bulan
2. End of month: admin trigger "Finalize Monthly Awards" atau CRON
3. User dengan points tertinggi per dimensi = Champion
4. Award badge di profile + notification

---

## 8. Dimension Leaderboard

### How Points Route to Dimensions

| Source | Dimension | Mechanism |
|--------|-----------|-----------|
| Quest claim | Quest's dimension_id | Direct from quest |
| Activity attendance | Activity type's dimension_id | Via activity_types.dimension_id |
| Steps (manual/Strava) | Physical | Always maps to Physical |
| Point adjustments | Admin-specified | Admin can target dimension |

### Leaderboard Filters

- **Overall**: Sum all dimension points
- **Per Dimension**: Filter by specific dimension
- **Monthly**: Current month only (for awards)

### Extend `point_adjustments` table

```sql
ALTER TABLE point_adjustments ADD COLUMN dimension_id UUID REFERENCES dimensions(id);
```

---

## 9. User Journey

### Daily Flow

```
User opens app → Dashboard
  ├── 6 dimension progress bars (monthly points per dimension)
  ├── Today's quests (from templates + manual + activity-linked)
  ├── Upcoming activities (with linked quest count)
  └── Active streak indicator (if streak event is on)

User claims quest
  ├── Select quest → check verification type
  ├── Upload photo if required
  ├── Earn coins + dimension points
  ├── Streak counter updates (if event active)
  └── Multiplier applied to points

User attends activity (scan QR)
  ├── Scan in → attendance started
  ├── Scan out → prorated points calculated
  ├── Points routed to activity type's dimension
  └── Activity-linked quests become claimable

Steps tracked (manual input or Strava)
  └── Auto-routes to Physical dimension
```

### Monthly Flow

```
End of month
  ├── Leaderboard per dimension finalized
  ├── 6 champions announced (one per dimension)
  ├── Award badges added to winner profiles
  ├── Notifications sent to winners
  └── All dimension points reset for new month
```

---

## 10. Phased Implementation

### Phase 1 — Rebranding + Dimension Foundation

- Rename WAM25 → WLM across codebase
- Update metadata, tagline, footer, login page
- Create `dimensions` table + seed 6 dimensions
- Add `dimension_id` to `quests` table
- Add `dimension_id` to `activity_types` table
- Update admin quest form: add dimension dropdown
- Update quest cards UI: show dimension label + icon

### Phase 2 — Quest Templates + Photo Verification

- Create `quest_templates` table
- Build admin UI for template CRUD
- Implement CRON/trigger for auto quest generation
- Activity-linked quest trigger on activity publish
- Photo upload on quest claim (Supabase Storage)
- Add `requires_photo`, `photo_url`, `verification_note` columns
- New verification types: `self_report`, `photo_proof`, `step_count`, `activity_attendance`

### Phase 3 — Dimension Leaderboard + Dashboard

- Leaderboard filter per dimension
- Dashboard: 6 dimension progress display
- Quest page: filter/tab per dimension
- Physical dimension: integrate steps data
- Add `dimension_id` to `point_adjustments`

### Phase 4 — Streak Events

- Create `streak_events` + `user_streaks` tables
- Admin UI for streak event CRUD (create, activate/deactivate)
- Streak calculation on quest claim
- Multiplier application to points
- Streak indicator in dashboard + quest cards

### Phase 5 — Monthly Awards + Polish

- Create `monthly_awards` table
- Admin trigger / CRON for monthly finalization
- Profile awards section with badges
- Award notification system
- Analytics dashboard per dimension
- Overall champion (cross-dimension) calculation

---

## 11. Technical Notes

### Steps Input

Steps are sourced from manual input (primary) or optional Strava/Apple Health sync. All step sources route to Physical dimension.

### Mono-brand Visual System

All dimensions use the same orange `#FC4C02` palette with shade/opacity variations. Differentiation is through icons (Lucide) and typography, not different colors. This maintains enterprise-grade brand consistency.

### Backward Compatibility

- Existing quests without `dimension_id` treated as "uncategorized" or default to Physical
- Existing leaderboard continues working (overall = sum all dimensions)
- No breaking changes to current user flow

### Database Migration Strategy

All changes are additive (new tables + new columns). No destructive migrations needed.
