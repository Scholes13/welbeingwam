-- Migration: Refine Survey to v4 (Detailed Scoring Update) - FIXED

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get the Corporate Wellbeing Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Clear existing questions to rebuild
    DELETE FROM survey_questions WHERE survey_id = v_survey_id;

    -- 3. Insert Refined Questions with Logic
    
    -- Q1: Profile (Gen Z, Millennial, Gen X, Boomer)
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 1, 'Di rentang usia berapa Anda berada saat ini?', '[
      {"label": "20-29 Tahun (Gen Z)", "impact": {"joy": 3, "power": 2}},
      {"label": "30-44 Tahun (Millennial)", "impact": {"focus": 3, "peace": 2}},
      {"label": "45-59 Tahun (Gen X)", "impact": {"peace": 3, "refresh": 2}},
      {"label": "60+ Tahun (Baby Boomer)", "impact": {"peace": 5, "refresh": 3}}
    ]'),

    -- Q2: Purpose (Explicit Goals)
    (v_survey_id, 2, 'Apa tujuan utama Anda datang hari ini?', '[
      {"label": "Fisik & Kebugaran: Saya ingin berkeringat, olahraga, dan melatih otot.", "impact": {"power": 5, "refresh": 3}},
      {"label": "Relaksasi & Anti-Stres: Saya ingin menenangkan pikiran dan melepas penat.", "impact": {"peace": 5, "refresh": 3}},
      {"label": "Penyembuhan Emosional: Saya sedang sedih/berat hati dan butuh pelepasan.", "impact": {"joy": 4, "peace": 4}},
      {"label": "Koneksi Sosial: Saya ingin bertemu orang baru dan bersenang-senang.", "impact": {"joy": 5, "power": 2}},
      {"label": "Eksplorasi Spiritual: Saya ingin mendalami meditasi atau sisi spiritual.", "impact": {"focus": 5, "peace": 3}}
    ]'),

    -- Q3: Work Context (Mapping to Needs)
    (v_survey_id, 3, 'Apa yang paling mendominasi hari kerja Anda?', '[
      {"label": "Duduk & Fokus (Laptop/PC)", "impact": {"refresh": 5, "peace": 3}}, 
      {"label": "Meeting & Diskusi (Interaksi)", "impact": {"peace": 5, "focus": 3}}, 
      {"label": "Mobilitas Tinggi (Fisik)", "impact": {"peace": 4, "refresh": 4}} 
    ]'),

    -- Q4: Physical Check (Pain Points)
    (v_survey_id, 4, 'Area tubuh mana yang paling meminta perhatian?', '[
      {"label": "Leher & Punggung (Upper Body)", "impact": {"refresh": 5, "peace": 2}}, 
      {"label": "Kaki & Pinggul (Lower Body)", "impact": {"peace": 5, "refresh": 3}}, 
      {"label": "Dada & Pernafasan (Breath)", "impact": {"peace": 5, "focus": 4}}, 
      {"label": "Seluruh Tubuh (General)", "impact": {"power": 4, "joy": 4}} 
    ]'),

    -- Q5: Current Energy
    (v_survey_id, 5, 'Bagaimana level energi Anda saat ini?', '[
        {"label": "Tinggi (Fire) - Siap tantangan", "impact": {"power": 5, "focus": 2}},
        {"label": "Sedang (Flow) - Ingin mengalir", "impact": {"refresh": 5, "joy": 3}},
        {"label": "Rendah (Earth) - Butuh istirahat", "impact": {"peace": 5, "refresh": 2}}
    ]'),

    -- Q6: Experience
    (v_survey_id, 6, 'Seberapa familiar Anda dengan Yoga/Wellness?', '[
        {"label": "Pemula (Baru mencoba)", "impact": {"refresh": 3, "peace": 2}},
        {"label": "Casual (Kadang-kadang)", "impact": {"joy": 3, "refresh": 2}},
        {"label": "Berpengalaman (Rutin)", "impact": {"power": 4, "focus": 4}}
    ]');

END $$;
