-- Migration: Neutralize Q9 Wording (Subtle Approach)
-- Goal: Make Q9 ask about "Feelings/Needs" instead of "Techniques".

DO $$
BEGIN
    -- Update Q9 Text and Options
    -- "Pembersihan Energi" -> "Rasa Ringan & Lepas" (Release)
    -- "Kasih Sayang" -> "Rasa Diterima & Disayang" (Acceptance)
    -- "Kejernihan" -> "Rasa Tenang & Teratur" (Clarity)
    
    UPDATE survey_questions 
    SET 
        question_text = 'Jika Anda bisa meminta satu perasaan untuk dibawa pulang, itu adalah...',
        options = '[
            {"label": "Rasa Tenang & Teratur (Calm Clarity) - Mengurai Kusut", "impact": {"focus": 5, "peace": 3}},
            {"label": "Rasa Diterima & Disayang (Embraced) - Berdamai dengan Diri", "impact": {"joy": 5, "peace": 3}},
            {"label": "Rasa Ringan & Lepas (Released) - Membuang Beban", "impact": {"peace": 4, "focus": 4}},
            {"label": "Rasa Segar & Kuat (Energized) - Siap Beraksi", "impact": {"power": 3, "refresh": 3}}
        ]'::jsonb
    WHERE order_index = 9;

END $$;
