-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Survey Submissions Table
CREATE TABLE IF NOT EXISTS public.survey_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous surveys if needed later
    custom_name TEXT, -- Optional: Capture name manually if not logged in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Survey Answers Table
CREATE TABLE IF NOT EXISTS public.survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.survey_submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Policies for Submissions
-- Allow anyone (authenticated or anon) to INSERT
CREATE POLICY "Enable insert for everyone" ON public.survey_submissions
    FOR INSERT WITH CHECK (true);

-- Allow users to view their OWN submissions
CREATE POLICY "Enable select for own submissions" ON public.survey_submissions
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Policies for Answers
-- Allow anyone to INSERT (via submission)
CREATE POLICY "Enable insert for everyone" ON public.survey_answers
    FOR INSERT WITH CHECK (true);

-- Admin access handled via Service Role (Bypasses RLS)

-- Allow users to VIEW answers linked to their submissions
CREATE POLICY "Enable select for own answers" ON public.survey_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.survey_submissions
            WHERE survey_submissions.id = survey_answers.submission_id
            AND survey_submissions.user_id = auth.uid()
        )
    );
