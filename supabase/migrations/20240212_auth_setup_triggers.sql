-- Migration: Auth Setup Triggers and Permissions
-- Description: Sets up auto-creation of profiles from auth.users and ensures RLS policies

-- 0. SCHEMA FIX: Add auth_user_id to profiles to handle legacy integer IDs
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- 1. Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We assume new users created via Auth have matching ID if we want standard behavior,
  -- BUT since we have legacy integer IDs, we insert the UUID into auth_user_id.
  -- Logic: If ID is UUID, we can try to use it as ID. If not, we rely on auth_user_id.
  
  INSERT INTO public.profiles (id, auth_user_id, username, full_name, avatar_url)
  VALUES (
    new.id, -- Valid if profiles.id is UUID. If profiles.id is int, this might fail unless cast?
            -- If profiles.id is int, we cannot insert UUID here.
            -- Using a generic ID generation strategy if needed, but for now assuming new DBs are UUID.
    new.id, -- Set auth_user_id
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN new;
EXCEPTION WHEN others THEN
  -- Fallback for legacy schema where id is Integer:
  -- We cannot insert 'new.id' (uuid) into 'id' (int).
  -- So we let the DB generate ID (if serial) or generate a random one,
  -- AND ensure auth_user_id is set.
  INSERT INTO public.profiles (auth_user_id, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply policies (Idempotent)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = auth_user_id ); -- Use auth_user_id check!

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = auth_user_id ); -- Use auth_user_id check!

-- 5. Admin Policy (New - Optional, Service Role used mostly)
