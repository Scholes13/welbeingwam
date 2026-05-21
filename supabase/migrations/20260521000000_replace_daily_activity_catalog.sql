-- ---------------------------------------------------------------------------
-- Replace daily activity_types catalog with the Excel point matrix
-- (Wellbeing_Points_Based_on_Calorie_Equivalent.xlsx).
--
-- Decisions captured in docs/plans/2026-05-21-replace-daily-activity-catalog-design.md:
--   * Excel `Equivalent Calories (kcal)` column maps 1:1 to point value.
--   * Replace total: deactivate every old daily code that is not in the new
--     whitelist; upsert the 25 new entries.
--   * Daily physical is removed from the catalog. Sport sessions and
--     `physical.steps` keep handling physical points.
--   * Excel "Bukti Aktivitas" cell is stored in `description` as a hint.
--   * WAM, Mid-Year Recharge, Internal Activities stay event-based and are
--     intentionally NOT seeded here (handled via admin_activities + attendance).
--
-- Idempotent: ON CONFLICT (code) DO UPDATE keeps re-runs safe; soft deactivation
-- preserves FKs from `activities`, `quest_templates`, and `admin_activities`.
-- ---------------------------------------------------------------------------

BEGIN;

-- 1. Defensive schema guard: older `20260217000001_activity_scan_in_out.sql`
--    created `activity_types` with `description`, but the newer
--    `20260519010000_create_activity_types.sql` re-declares the table without
--    that column. CREATE TABLE IF NOT EXISTS means an environment that ran the
--    older migration first will still be missing nothing, but environments
--    bootstrapped from the newer migration need the column added explicitly.
ALTER TABLE public.activity_types
    ADD COLUMN IF NOT EXISTS description text;

-- 2. Soft-deactivate every daily activity_type that is not part of the new
--    Excel-driven whitelist. Sport rows and `physical.steps` are untouched.
UPDATE public.activity_types
SET is_active = false,
    updated_at = now()
WHERE mode = 'daily'
  AND code <> 'physical.steps'
  AND code NOT IN (
      'emotional.konsultasi_coaching',
      'emotional.nonton_film_dokumenter',
      'emotional.sharing_session',
      'emotional.seminar_mental_health',
      'emotional.meditasi',
      'emotional.baca_buku_fisik',
      'emotional.baca_ebook',
      'emotional.podcast',
      'social.hobi',
      'social.donor_darah',
      'social.buddy_program',
      'social.training_skills',
      'financial.tabungan_emas',
      'financial.tabungan_deposito',
      'financial.tabungan_saham',
      'financial.tabungan_crypto',
      'financial.program_tabungan',
      'financial.asuransi',
      'financial.koperasi',
      'spiritual.kajian_rohani',
      'spiritual.pelayanan',
      'spiritual.bakti_sosial',
      'spiritual.hari_besar',
      'spiritual.donasi',
      'spiritual.csr'
  );

-- 3. Upsert the 25 new daily activity_types from the Excel point matrix.
--    Display names are Title Case Indonesian; `description` carries the
--    Excel "Bukti Aktivitas" hint verbatim.
INSERT INTO public.activity_types (
    code, name, mode, dimension_id, points,
    requires_steps, requires_calories, is_active, sort_order, description
)
SELECT
    v.code,
    v.name,
    v.mode,
    d.id,
    v.points,
    false,
    false,
    true,
    v.sort_order,
    v.description
FROM (VALUES
    -- ----- EMOTIONAL (8) -----
    ('emotional.konsultasi_coaching',
     'Konsultasi / Coaching / Mentoring',
     'daily', 'emotional', 150, 110,
     'Foto, screenshot, atau bukti partisipasi'),
    ('emotional.nonton_film_dokumenter',
     'Menonton Film / Dokumenter (1,5-2,5 Jam)',
     'daily', 'emotional', 100, 120,
     'Foto, screenshot, atau bukti partisipasi'),
    ('emotional.sharing_session',
     'Sharing Session',
     'daily', 'emotional',  80, 130,
     'Foto, screenshot, atau bukti partisipasi'),
    ('emotional.seminar_mental_health',
     'Seminar Mengenai Mental Health',
     'daily', 'emotional', 120, 140,
     'Foto, screenshot, atau bukti partisipasi'),
    ('emotional.meditasi',
     'Meditasi',
     'daily', 'emotional',  70, 150,
     'Foto, screenshot, atau bukti partisipasi'),
    ('emotional.baca_buku_fisik',
     'Membaca 1 Buku Fisik (Novel, Fiction, Action, Thriller, Biography, Komik)',
     'daily', 'emotional', 300, 160,
     'Foto, screenshot, atau bukti partisipasi dan rangkuman'),
    ('emotional.baca_ebook',
     'Membaca 1 Buku E-Book (Novel, Fiction, Action, Thriller, Biography, Komik)',
     'daily', 'emotional', 300, 170,
     'Foto, screenshot, atau bukti partisipasi dan rangkuman'),
    ('emotional.podcast',
     'Mendengarkan Podcast',
     'daily', 'emotional',  80, 180,
     'Foto, screenshot, atau bukti partisipasi dan rangkuman'),

    -- ----- SOCIAL (4) -----
    -- WAM / Mid-Year Recharge / Internal Activities are intentionally omitted;
    -- they remain event-based via admin_activities + attendance.
    ('social.hobi',
     'Penyaluran Hobi / Minat Non Physical, Non Spiritual',
     'daily', 'social', 150, 110,
     'Foto, screenshot, atau bukti partisipasi'),
    ('social.donor_darah',
     'Donor Darah',
     'daily', 'social', 200, 120,
     'Kartu donor atau sertifikat'),
    ('social.buddy_program',
     'Buddy Program',
     'daily', 'social',  80, 130,
     'Foto, screenshot, atau bukti partisipasi'),
    ('social.training_skills',
     'Mengikuti Training Berkaitan dengan Hard Skills & Soft Skills',
     'daily', 'social', 120, 140,
     'Sertifikat atau foto kegiatan dan rangkuman'),

    -- ----- FINANCIAL (7) -----
    ('financial.tabungan_emas',
     'Membuka Tabungan Emas',
     'daily', 'financial', 150, 110,
     'Screenshot/bukti transaksi'),
    ('financial.tabungan_deposito',
     'Membuka Tabungan Deposito',
     'daily', 'financial', 300, 120,
     'Screenshot/bukti transaksi'),
    ('financial.tabungan_saham',
     'Membuka Tabungan Saham / Reksadana',
     'daily', 'financial', 300, 130,
     'Screenshot/bukti transaksi'),
    ('financial.tabungan_crypto',
     'Membuka Tabungan Crypto',
     'daily', 'financial', 300, 140,
     'Screenshot/bukti transaksi'),
    ('financial.program_tabungan',
     'Membuat Program Tabungan Tertentu',
     'daily', 'financial', 300, 150,
     'Foto, screenshot, atau bukti partisipasi'),
    ('financial.asuransi',
     'Membeli Asuransi (di Luar BPJS Kes / Ketenagakerjaan)',
     'daily', 'financial', 300, 160,
     'Screenshot/bukti transaksi'),
    ('financial.koperasi',
     'Mengikuti Koperasi (Membuka Tabungan / Mengikuti Kegiatan)',
     'daily', 'financial', 300, 170,
     'Foto, screenshot, atau bukti partisipasi'),

    -- ----- SPIRITUAL (6) -----
    ('spiritual.kajian_rohani',
     'Mengikuti Kajian Rohani',
     'daily', 'spiritual',  80, 110,
     'Foto, screenshot, atau bukti partisipasi'),
    ('spiritual.pelayanan',
     'Pelayanan',
     'daily', 'spiritual', 100, 120,
     'Foto, screenshot, atau bukti partisipasi'),
    ('spiritual.bakti_sosial',
     'Bakti Sosial',
     'daily', 'spiritual', 100, 130,
     'Foto, screenshot, atau bukti partisipasi'),
    ('spiritual.hari_besar',
     'Perayaan Hari Besar Keagamaan',
     'daily', 'spiritual',  80, 140,
     'Foto, screenshot, atau bukti partisipasi'),
    ('spiritual.donasi',
     'Donasi',
     'daily', 'spiritual', 100, 150,
     'Foto, screenshot, atau bukti partisipasi'),
    ('spiritual.csr',
     'CSR',
     'daily', 'spiritual', 100, 160,
     'Foto, screenshot, atau bukti partisipasi')
) AS v(code, name, mode, dim_name, points, sort_order, description)
LEFT JOIN public.dimensions d ON d.name = v.dim_name
ON CONFLICT (code) DO UPDATE SET
    name          = EXCLUDED.name,
    mode          = EXCLUDED.mode,
    dimension_id  = EXCLUDED.dimension_id,
    points        = EXCLUDED.points,
    sort_order    = EXCLUDED.sort_order,
    description   = EXCLUDED.description,
    is_active     = true,
    requires_steps    = false,
    requires_calories = false,
    updated_at    = now();

COMMIT;
