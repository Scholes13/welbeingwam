# Replace Daily Activity Catalog from Excel — Design

Date: 2026-05-21
Owner: PM Agent (orchestration), `@coder_backend` (migration), `@coder_frontend` (form sync)
Status: Approved
Source: `Excel/Wellbeing_Points_Based_on_Calorie_Equivalent.xlsx`

## Problem

The current `activity_types` daily catalog (seeded by
`supabase/migrations/20260519010000_create_activity_types.sql`) does not match
the Excel point matrix the business is committing to:

- 4 of 5 dimensions are under-populated (Emotional 2 vs Excel 8, Financial 2
  vs 7, Spiritual 1 vs 6, Social 3 vs Excel 4 self-report items).
- Several activities sit in the wrong dimension (CSR is Social in seed, but
  Spiritual in Excel).
- Point values do not follow the new rule "1 point = 1 kcal-equivalent" the
  Excel matrix encodes (e.g. Konsultasi seed=50, Excel=150).
- The catalog has no `description` field for the per-row "Bukti Aktivitas"
  hint the Excel ships with.

## Decisions (from brainstorm)

1. Excel `Equivalent Calories (kcal)` column is used **1:1 as point value**.
2. **Replace total** for daily non-physical: deactivate old daily codes that
   are not in the Excel whitelist; upsert the new entries.
3. **Daily physical is removed** from the catalog. Physical points come from
   Sport sessions (Strava-based) and the existing `physical.steps` row only.
4. The Excel "Bukti Aktivitas" cell becomes the activity's `description`
   (hint text). Proof itself is still uploaded via the existing photo flow.
5. UI activity names use **Title Case Indonesian**, e.g.
   "Konsultasi / Coaching / Mentoring" — codes stay snake_case English.
6. **WAM, Mid-Year Recharge, Internal Activities are NOT added** to the
   self-report catalog. They remain event-based via `admin_activities` +
   attendance scan to avoid double-claim.

## Catalog (25 daily entries)

| code                              | dimension  | points | name                                                                      |
|-----------------------------------|------------|--------|---------------------------------------------------------------------------|
| emotional.konsultasi_coaching     | emotional  | 150    | Konsultasi / Coaching / Mentoring                                          |
| emotional.nonton_film_dokumenter  | emotional  | 100    | Menonton Film / Dokumenter (1,5-2,5 Jam)                                  |
| emotional.sharing_session         | emotional  | 80     | Sharing Session                                                            |
| emotional.seminar_mental_health   | emotional  | 120    | Seminar Mengenai Mental Health                                             |
| emotional.meditasi                | emotional  | 70     | Meditasi                                                                   |
| emotional.baca_buku_fisik         | emotional  | 300    | Membaca 1 Buku Fisik (Novel, Fiction, Action, Thriller, Biography, Komik) |
| emotional.baca_ebook              | emotional  | 300    | Membaca 1 Buku E-Book (Novel, Fiction, Action, Thriller, Biography, Komik)|
| emotional.podcast                 | emotional  | 80     | Mendengarkan Podcast                                                       |
| social.hobi                       | social     | 150    | Penyaluran Hobi / Minat Non Physical, Non Spiritual                        |
| social.donor_darah                | social     | 200    | Donor Darah                                                                |
| social.buddy_program              | social     | 80     | Buddy Program                                                              |
| social.training_skills            | social     | 120    | Mengikuti Training Berkaitan dengan Hard Skills & Soft Skills              |
| financial.tabungan_emas           | financial  | 150    | Membuka Tabungan Emas                                                      |
| financial.tabungan_deposito       | financial  | 300    | Membuka Tabungan Deposito                                                  |
| financial.tabungan_saham          | financial  | 300    | Membuka Tabungan Saham / Reksadana                                         |
| financial.tabungan_crypto         | financial  | 300    | Membuka Tabungan Crypto                                                    |
| financial.program_tabungan        | financial  | 300    | Membuat Program Tabungan Tertentu                                          |
| financial.asuransi                | financial  | 300    | Membeli Asuransi (di Luar BPJS Kes / Ketenagakerjaan)                      |
| financial.koperasi                | financial  | 300    | Mengikuti Koperasi (Membuka Tabungan / Mengikuti Kegiatan)                 |
| spiritual.kajian_rohani           | spiritual  | 80     | Mengikuti Kajian Rohani                                                    |
| spiritual.pelayanan               | spiritual  | 100    | Pelayanan                                                                  |
| spiritual.bakti_sosial            | spiritual  | 100    | Bakti Sosial                                                               |
| spiritual.hari_besar              | spiritual  | 80     | Perayaan Hari Besar Keagamaan                                              |
| spiritual.donasi                  | spiritual  | 100    | Donasi                                                                     |
| spiritual.csr                     | spiritual  | 100    | CSR                                                                        |

`description` is taken verbatim from Excel "Bukti Aktivitas" column for each
row (e.g. "Foto, screenshot, atau bukti partisipasi", "Kartu donor atau
sertifikat", "Sertifikat atau foto kegiatan dan rangkuman", etc.).

## Codes deactivated (not deleted)

Soft `is_active = false` to preserve FKs from `activities`,
`quest_templates.linked_activity_type_id`, and `admin_activities.type_id`.

- Daily emotional: `emotional.konsultasi`, `emotional.hobi`
- Daily social: `social.team_building`, `social.kegiatan_sosial`, `social.csr`
- Daily financial: `financial.tabungan`, `financial.seminar`
- Daily spiritual: `spiritual.ibadah`
- Daily physical: `physical.werkudara_workout`, `physical.yoga`,
  `physical.badminton`, `physical.hiking`, `physical.treadmill`,
  `physical.olahraga_sendiri`

`physical.steps` and all `sport.*` rows are left untouched.

## Migration

`supabase/migrations/20260521000000_replace_daily_activity_catalog.sql`,
single transaction, idempotent:

1. `ALTER TABLE activity_types ADD COLUMN IF NOT EXISTS description text;`
   (defensive against environments still on the
   `20260217000001_activity_scan_in_out.sql` shape).
2. Soft-deactivate all daily rows whose `code` is not in the new whitelist.
3. Upsert the 25 rows from the table above with
   `ON CONFLICT (code) DO UPDATE SET name, dimension_id, points, description,
   sort_order, is_active = true, mode = 'daily', updated_at = now()`.

## Frontend impact

- `AddActivityBtn.tsx` is fully data-driven via `/api/activity-types`. No
  change.
- `WellbeingActivityForm.tsx` (downgrade-mode form) ships a hardcoded list
  with old names. Needs a sync edit: drop the `physical` dimension entry,
  rewrite the `emotional`, `social`, `financial`, `spiritual` activity names
  to match the migration verbatim, and load `descriptionHint` from the
  Excel "Bukti Aktivitas" column. This is required because
  `/api/activities/create` looks up `activity_types` by `(mode, name,
  is_active=true)`; mismatched names silently award 0 points.

## Verification

1. Apply migration locally and run:
   ```sql
   SELECT d.name, COUNT(*)
   FROM activity_types t
   JOIN dimensions d ON d.id = t.dimension_id
   WHERE t.mode = 'daily' AND t.is_active = true
   GROUP BY d.name;
   ```
   Expected: emotional=8, social=4, financial=7, spiritual=6, physical=1.
2. `GET /api/activity-types` returns the new catalog (25 daily + 1 steps + 7
   sport).
3. End-to-end smoke: submit a daily activity via the UI for each dimension
   and verify `activities.activity_points` matches Excel value.
4. Old-name regression: submit using a deactivated name; expect graceful 0
   points (no 500), since the lookup filters by `is_active = true`.
5. Run `npm test` and `npx tsc --noEmit` to ensure no breakage.

## Risks / follow-ups

- **Point inflation for new submissions** (e.g. Konsultasi 50 -> 150). Old
  history rows in `activities` and `coin_transactions` are not rewritten.
  Communicate this in release notes.
- **WAM / Mid-Year / Internal** must be published as `admin_activities`
  events before users can earn points there. Reconfirm with admin team.
- **Daily physical removed** from self-report. Users that used to log Yoga
  daily must use Sport mode (Strava sync or manual sport entry with
  calories) instead. Mention in release notes.
