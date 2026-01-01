-- Migration: Update Survey Questions to Detailed Wellness Version (v2)

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get the Corporate Wellbeing Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;

    -- If not found (edge case), just use the first available survey
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Remove old questions (Index 2-5)
    DELETE FROM survey_questions WHERE survey_id = v_survey_id AND order_index >= 2;

    -- 3. Insert New Questions (Q2 - Q5)
    
    -- Q2: Tujuan Utama (The "Why")
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 2, 'Apa tujuan utama Anda datang hari ini?', '[
        {"label": "Fisik & Kebugaran (Sweat)", "impact": {"power": 5, "refresh": 3}},
        {"label": "Relaksasi & Anti-Stres (Calm)", "impact": {"peace": 5, "refresh": 3}},
        {"label": "Penyembuhan Emosional (Healing)", "impact": {"joy": 4, "peace": 4}},
        {"label": "Koneksi Sosial (Fun)", "impact": {"joy": 5, "power": 2}},
        {"label": "Eksplorasi Spiritual (Deep)", "impact": {"focus": 5, "peace": 3}}
    ]'),

    -- Q3: Tingkat Energi (The "Energy")
    (v_survey_id, 3, 'Bagaimana tingkat energi Anda saat ini?', '[
        {"label": "Tinggi (Fire) - Siap bergerak aktif", "impact": {"power": 5, "focus": 2}},
        {"label": "Sedang (Flow) - Gerak tanpa paksaan", "impact": {"refresh": 5, "joy": 3}},
        {"label": "Rendah (Earth) - Ingin santai/duduk", "impact": {"peace": 5, "refresh": 2}}
    ]'),

    -- Q4: Pengalaman (The "Level")
    (v_survey_id, 4, 'Seberapa familiar Anda dengan aktivitas ini?', '[
        {"label": "Pemula Absolut (Baru Coba)", "impact": {"refresh": 3, "peace": 2}},
        {"label": "Praktisi Kasual (Kadang-kadang)", "impact": {"joy": 3, "refresh": 2}},
        {"label": "Berpengalaman (Rutin)", "impact": {"power": 4, "focus": 4}}
    ]'),

    -- Q5: Preferensi Suasana (The "Vibe")
    (v_survey_id, 5, 'Suasana seperti apa yang Anda butuhkan?', '[
        {"label": "Hening & Introspektif (Fokus ke dalam)", "impact": {"peace": 4, "focus": 4}},
        {"label": "Seru & Komunal (Energi Kelompok)", "impact": {"joy": 5, "power": 3}},
        {"label": "Edukasi & Teknik (Belajar)", "impact": {"focus": 5, "power": 2}}
    ]');

END $$;
