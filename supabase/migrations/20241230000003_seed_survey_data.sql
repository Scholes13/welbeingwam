-- Clean up existing survey data to avoid duplicates
TRUNCATE TABLE public.user_responses CASCADE;
TRUNCATE TABLE public.survey_options CASCADE;
TRUNCATE TABLE public.survey_questions CASCADE;

-- Insert Questions with specific UUIDs
INSERT INTO public.survey_questions (id, question_text, order_index) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'What is your primary wellness goal?', 1),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'How is your sleep quality?', 2),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'How are your energy levels usually?', 3);

-- Insert Options linked to those UUIDs
INSERT INTO public.survey_options (question_id, label, value, recommended_tags) VALUES
-- Q1: Goal
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Improve Sleep', 'sleep', ARRAY['sleep', 'recovery']),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boost Energy', 'energy', ARRAY['energy', 'focus']),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Muscle Recovery', 'recovery', ARRAY['muscle', 'protein']),

-- Q2: Sleep
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Deep & Restful', 'good_sleep', ARRAY[]::text[]),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Trouble Falling Asleep', 'cant_fall_asleep', ARRAY['sleep', 'melatonin']),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Waking Up Tired', 'poor_quality', ARRAY['magnesium', 'sleep']),

-- Q3: Energy
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'High / Active', 'high_energy', ARRAY[]::text[]),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Afternoon Slump', 'slump', ARRAY['energy', 'matcha']),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Always Tired', 'fatigue', ARRAY['energy', 'iron']);
