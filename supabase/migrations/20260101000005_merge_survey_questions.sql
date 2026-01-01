-- Migration: Merge General & Wellness Questions (Hybrid v3)

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get the Corporate Wellbeing Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Clear existing questions to rebuild the flow properly (avoid index conflicts)
    DELETE FROM survey_questions WHERE survey_id = v_survey_id;

    -- 3. Insert Hybrid Questions (1-6)
    
    -- Q1: Profile (Age) - Keeping the Generational Update
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 1, 'Di rentang usia berapa Anda berada saat ini?', '[
      {"label": "Gen Z (The Explorers)", "impact": {"joy": 3, "power": 2}},
      {"label": "Millennial (The Builders)", "impact": {"focus": 3, "peace": 2}},
      {"label": "Gen X (The Leaders)", "impact": {"peace": 3, "refresh": 2}},
      {"label": "Baby Boomer (The Legends)", "impact": {"peace": 5, "refresh": 3}}
    ]'),

    -- Q2: Work Context (General) - Excellent for determining physical needs
    (v_survey_id, 2, 'Apa yang paling mendominasi hari kerja Anda?', '[
      {"label": "Duduk & Fokus (Laptop/PC)", "impact": {"refresh": 5, "power": 2}},
      {"label": "Meeting & Diskusi (Interaksi)", "impact": {"peace": 5, "joy": 2}},
      {"label": "Mobilitas Tinggi (Fisik)", "impact": {"peace": 3, "refresh": 4}}
    ]'),

    -- Q3: Physical Check (General) - Specific pain points
    (v_survey_id, 3, 'Area tubuh mana yang paling meminta perhatian?', '[
      {"label": "Leher & Punggung (Atas)", "impact": {"refresh": 5, "power": 2}},
      {"label": "Kaki & Pinggul (Bawah)", "impact": {"power": 3, "joy": 4}},
      {"label": "Dada & Pernafasan (Nafas)", "impact": {"peace": 5, "focus": 3}},
      {"label": "Seluruh Tubuh (Lelah Total)", "impact": {"power": 4, "refresh": 4}}
    ]'),

    -- Q4: Current Energy (Wellness) - Better than "Mental Battery"
    (v_survey_id, 4, 'Bagaimana level energi Anda saat ini?', '[
        {"label": "Tinggi (Fire) - Siap tantangan", "impact": {"power": 5, "focus": 2}},
        {"label": "Sedang (Flow) - Ingin mengalir", "impact": {"refresh": 5, "joy": 3}},
        {"label": "Rendah (Earth) - Butuh istirahat", "impact": {"peace": 5, "refresh": 2}}
    ]'),

    -- Q5: The Intention (Wellness) - Replaces generic "Gift"
    (v_survey_id, 5, 'Apa hadiah utama yang Anda cari hari ini?', '[
        {"label": "Kebugaran Fisik (Sweat)", "impact": {"power": 5, "refresh": 3}},
        {"label": "Detox Stress (Relaxation)", "impact": {"peace": 5, "refresh": 3}},
        {"label": "Healing Emosional (Release)", "impact": {"joy": 4, "peace": 4}},
        {"label": "Koneksi Spiritual (Deep)", "impact": {"focus": 5, "peace": 3}}
    ]'),

    -- Q6: Experience (Wellness) - Critical for class selection
    (v_survey_id, 6, 'Seberapa familiar Anda dengan Yoga/Wellness?', '[
        {"label": "Pemula (Baru mencoba)", "impact": {"refresh": 3, "peace": 2}},
        {"label": "Casual (Kadang-kadang)", "impact": {"joy": 3, "refresh": 2}},
        {"label": "Berpengalaman (Rutin)", "impact": {"power": 4, "focus": 4}}
    ]');

END $$;
