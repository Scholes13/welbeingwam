-- Update the "Age" question (Order Index 1) to use Generational Labels
DO $$
BEGIN
    UPDATE survey_questions
    SET options = '[
      {"label": "Gen Z (The Explorers)", "impact": {"joy": 3, "power": 2}},
      {"label": "Millennial (The Builders)", "impact": {"focus": 3, "peace": 2}},
      {"label": "Gen X (The Leaders)", "impact": {"peace": 3, "refresh": 2}},
      {"label": "Baby Boomer (The Legends)", "impact": {"peace": 5, "refresh": 3}}
    ]'::jsonb
    WHERE order_index = 1 OR question_text ILIKE 'Rentang usia%';
END $$;
