-- Create Follow-up Survey: Activity Recommendation Feedback
-- This survey has conditional branching based on first answer

-- 1. Add condition column if not exists
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS condition jsonb DEFAULT NULL;

-- 2. Create the survey container
INSERT INTO surveys (title, description, is_active)
VALUES (
    'Activity Feedback Survey',
    'Tell us about your experience with our activity recommendations!',
    true
)
ON CONFLICT DO NOTHING;

-- 3. Insert questions
DO $$
DECLARE
    survey_id_var UUID;
BEGIN
    -- Get the survey ID
    SELECT id INTO survey_id_var FROM surveys WHERE title = 'Activity Feedback Survey' LIMIT 1;
    
    IF survey_id_var IS NOT NULL THEN
        -- Delete existing questions first to avoid duplicates
        DELETE FROM survey_questions WHERE survey_id = survey_id_var;
        
        -- Q1: Did you follow the recommendation?
        INSERT INTO survey_questions (survey_id, question_text, order_index, options)
        VALUES (
            survey_id_var,
            'Apakah kamu mengikuti rekomendasi Activity YogaBarn dari kami?',
            1,
            '[
                {"label": "Ya, saya mengikuti rekomendasi", "value": "yes"},
                {"label": "Tidak, saya memilih activity lain", "value": "no"}
            ]'::jsonb
        );

        -- Q2: (Conditional - shown if Q1 = "no") What activity did you join?
        INSERT INTO survey_questions (survey_id, question_text, order_index, options, condition)
        VALUES (
            survey_id_var,
            'Activity apa yang kamu ikuti?',
            2,
            '[
                {"label": "Yoga Flow", "value": "yoga_flow"},
                {"label": "Vinyasa", "value": "vinyasa"},
                {"label": "Yin Yoga", "value": "yin_yoga"},
                {"label": "Sound Healing", "value": "sound_healing"},
                {"label": "Meditation", "value": "meditation"},
                {"label": "Pilates", "value": "pilates"},
                {"label": "Breathwork", "value": "breathwork"},
                {"label": "Lainnya", "value": "other"}
            ]'::jsonb,
            '{"question_index": 0, "answer_value": "no"}'::jsonb
        );

        -- Q3: What insights did you gain?
        INSERT INTO survey_questions (survey_id, question_text, order_index, options)
        VALUES (
            survey_id_var,
            'Insight apa yang kamu dapatkan dari activity tersebut? (Pilih semua yang sesuai)',
            3,
            '[
                {"label": "Lebih rileks dan tenang", "value": "relaxed"},
                {"label": "Meningkatkan fokus", "value": "focus"},
                {"label": "Tubuh terasa lebih bugar", "value": "fit"},
                {"label": "Tidur lebih nyenyak", "value": "better_sleep"},
                {"label": "Mengurangi stres", "value": "stress_relief"},
                {"label": "Menemukan komunitas baru", "value": "community"},
                {"label": "Belajar teknik baru", "value": "new_technique"},
                {"label": "Belum merasakan perubahan", "value": "no_change"}
            ]'::jsonb
        );

        -- Q4: Overall satisfaction
        INSERT INTO survey_questions (survey_id, question_text, order_index, options)
        VALUES (
            survey_id_var,
            'Seberapa puas kamu dengan pengalaman activity tersebut?',
            4,
            '[
                {"label": "⭐⭐⭐⭐⭐ Sangat Puas", "value": "5"},
                {"label": "⭐⭐⭐⭐ Puas", "value": "4"},
                {"label": "⭐⭐⭐ Cukup", "value": "3"},
                {"label": "⭐⭐ Kurang Puas", "value": "2"},
                {"label": "⭐ Tidak Puas", "value": "1"}
            ]'::jsonb
        );

        -- Q5: Would you recommend?
        INSERT INTO survey_questions (survey_id, question_text, order_index, options)
        VALUES (
            survey_id_var,
            'Apakah kamu akan merekomendasikan activity ini ke teman?',
            5,
            '[
                {"label": "Pasti akan!", "value": "definitely"},
                {"label": "Mungkin", "value": "maybe"},
                {"label": "Tidak yakin", "value": "unsure"},
                {"label": "Tidak", "value": "no"}
            ]'::jsonb
        );
    END IF;
END $$;

