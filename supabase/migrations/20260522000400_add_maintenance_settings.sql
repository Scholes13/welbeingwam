CREATE TABLE IF NOT EXISTS public.settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (key, value)
VALUES
  ('maintenance_enabled', to_jsonb(FALSE)),
  ('maintenance_message', to_jsonb('We are performing scheduled maintenance. Please check back soon.'::TEXT))
ON CONFLICT (key) DO NOTHING;
