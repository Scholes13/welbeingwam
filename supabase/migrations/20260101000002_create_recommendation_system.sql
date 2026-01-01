-- 1. Modify Products Table (Add columns safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='time') THEN
        ALTER TABLE products ADD COLUMN time text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='instructor') THEN
        ALTER TABLE products ADD COLUMN instructor text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weighted_tags') THEN
        ALTER TABLE products ADD COLUMN weighted_tags jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Modify Survey Questions Table (Add options JSONB)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='survey_questions' AND column_name='options') THEN
        ALTER TABLE survey_questions ADD COLUMN options jsonb DEFAULT '[]'::jsonb;
    END IF;
    -- Ensure survey_id exists (it should from previous migrations, but safe to ignore if present)
END $$;

-- 3. SEED DATA with Safe Links
DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- A. Create or Get "Corporate Wellbeing" Survey
    INSERT INTO surveys (title, description, is_active)
    VALUES ('Corporate Wellbeing', 'Jan 8 Recommendation System', true)
    RETURNING id INTO v_survey_id;
    
    -- If we want to be idempotent and it already existed, we would query it, 
    -- but for now we essentially create a new one to avoid messing with old data.

    -- B. Insert Questions (Using order_index and options)
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 1, 'Rentang usia Anda saat ini?', '[
      {"label": "Gen Z (The Explorers)", "impact": {"joy": 3, "power": 2}},
      {"label": "Millennial (The Builders)", "impact": {"focus": 3, "peace": 2}},
      {"label": "Gen X (The Leaders)", "impact": {"peace": 3, "refresh": 2}},
      {"label": "Baby Boomer (The Legends)", "impact": {"peace": 5, "refresh": 3}}
    ]'),
    (v_survey_id, 2, 'Apa yang paling mendominasi hari kerja Anda?', '[
      {"label": "Duduk & Fokus (Laptop)", "impact": {"refresh": 5, "power": 2}},
      {"label": "Meeting & Diskusi", "impact": {"peace": 5, "joy": 2}},
      {"label": "Mobilitas Tinggi (Fisik)", "impact": {"peace": 3, "refresh": 4}}
    ]'),
    (v_survey_id, 3, 'Bagaimana status "Baterai Mental" Anda saat ini?', '[
      {"label": "High Speed (Pikiran berputar)", "impact": {"peace": 5, "focus": 3}},
      {"label": "Low Power (Lelah/Kosong)", "impact": {"joy": 4, "refresh": 5}},
      {"label": "Balanced (Siap Tantangan)", "impact": {"power": 5, "joy": 3}}
    ]'),
    (v_survey_id, 4, 'Area tubuh mana yang meminta perhatian?', '[
      {"label": "Leher & Punggung", "impact": {"refresh": 5, "power": 2}},
      {"label": "Kaki & Pinggul", "impact": {"power": 3, "joy": 4}},
      {"label": "Dada & Pernafasan", "impact": {"peace": 5, "focus": 3}},
      {"label": "Seluruh Tubuh", "impact": {"power": 4, "refresh": 4}}
    ]'),
    (v_survey_id, 5, 'Apa hadiah yang Anda butuhkan esok hari?', '[
      {"label": "Ketenangan (Peace)", "impact": {"peace": 10}},
      {"label": "Kekuatan (Power)", "impact": {"power": 10}},
      {"label": "Penyegaran (Refresh)", "impact": {"refresh": 10}},
      {"label": "Inspirasi (Joy)", "impact": {"joy": 10}}
    ]');

    -- C. Insert Products (Using weighted_tags)
    INSERT INTO products (name, time, instructor, description, weighted_tags) VALUES
    ('Hatha - Rise n'' Shine', '07:00 AM', 'Gregory Kaps', 'Gerakan lembut untuk membangunkan tubuh dan memperbaiki postur.', '{"peace": 5, "refresh": 8, "power": 3}'),
    ('Morning Flow', '07:15 AM', 'Laura Rodenas', 'Aliran gerakan dinamis seperti kopi pagi untuk tubuh.', '{"refresh": 10, "power": 6, "joy": 5}'),
    ('Beginners Meditation', '07:30 AM', 'Jana Johnson', 'Meditasi dasar untuk menjernihkan pikiran yang sibuk.', '{"peace": 10, "focus": 8, "power": 0}'),
    ('Vinyasa Flow', '08:30 AM', 'Made Murni', 'Latihan kardio dinamis untuk membakar semangat.', '{"power": 9, "refresh": 7, "joy": 5}'),
    ('Kundalini Yoga', '09:00 AM', 'Gregory Kaps', 'Teknik pernafasan dan energi untuk stamina mental.', '{"peace": 6, "power": 8, "focus": 7}'),
    ('Divine Awakening Qi Mastery', '09:00 AM', 'Sai Calder', 'Membangun kekuatan internal dan grounding spiritual.', '{"peace": 8, "focus": 9, "power": 4}'),
    ('Loving Kindness Meditation', '09:30 AM', 'Candice Halliday', 'Penyembuhan emosional dan cinta kasih.', '{"peace": 10, "joy": 6, "power": 0}'),
    ('Strong Slow Flow', '10:30 AM', 'Byron de Marse', 'Membangun otot dan stabilitas dengan gerakan lambat terkontrol.', '{"power": 10, "focus": 7, "refresh": 4}'),
    ('Presence & Purification', '11:00 AM', 'Moishe Wariko', 'Membersihkan energi negatif dan menenangkan saraf.', '{"peace": 10, "refresh": 6, "focus": 8}'),
    ('FLOW STATE: Water Dance', '11:30 AM', 'Bethany Burton', 'Bebaskan diri dengan gerakan cair dan menyenangkan.', '{"joy": 10, "refresh": 7, "peace": 5}'),
    ('Pilates on the Mat', '11:30 AM', 'Felicia Terlecki', 'Perbaiki postur dan kuatkan otot inti (core).', '{"power": 8, "refresh": 6, "focus": 5}'),
    ('Yin & Acupressure Points', '11:30 AM', 'Wine Pramiyanti', 'Istirahat mendalam untuk melepas lelah fisik.', '{"peace": 9, "refresh": 8, "power": 1}');

END $$;
