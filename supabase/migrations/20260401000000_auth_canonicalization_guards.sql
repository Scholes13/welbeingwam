CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique
ON public.profiles (auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_canonical_unique
ON public.profiles ((lower(trim(username))))
WHERE username IS NOT NULL;
