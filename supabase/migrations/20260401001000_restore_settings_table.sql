CREATE TABLE IF NOT EXISTS public.settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (key, value)
VALUES
  ('base_checkin_points', to_jsonb(50)),
  ('photo_bonus_points', to_jsonb(50)),
  ('category_streak_bonus', to_jsonb(200)),
  ('speed_demon_bonus', to_jsonb(300)),
  ('strava_sync_cooldown_minutes', to_jsonb(15)),
  ('feature_qr_checkin', to_jsonb(TRUE)),
  ('feature_gps_checkin', to_jsonb(TRUE)),
  ('feature_photo_checkin', to_jsonb(TRUE)),
  ('feature_badges', to_jsonb(TRUE)),
  ('feature_leaderboard', to_jsonb(TRUE)),
  ('feature_rewards', to_jsonb(TRUE)),
  ('feature_surveys', to_jsonb(TRUE)),
  ('feature_category_filter', to_jsonb(TRUE))
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.settings_set_updated_at();
