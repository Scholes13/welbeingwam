# Supabase Auth Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from custom cookie-based auth (`profiles.id = BIGINT`) to Supabase Auth (`auth.users.id = UUID`), preserving all 50 existing users and their related data (points, quests, rewards, steps, coins, attendance, etc.)

**Architecture:** 
- Phase 1: Database migration — add UUID column, create auth.users entries, migrate all FK references
- Phase 2: Auth infrastructure — install `@supabase/ssr`, create middleware, update Supabase client helpers
- Phase 3: API route migration — replace cookie reads with `supabase.auth.getUser()`, replace Service Role with server client
- Phase 4: Login/UI migration — update login forms, add "Connect Strava" flow, add RLS policies

**Tech Stack:** Next.js 16, Supabase Auth (`@supabase/ssr`), `@supabase/supabase-js` v2, PostgreSQL

---

## Current State Analysis

### `profiles.id` is `BIGINT`
- Strava users: positive integer (Strava Athlete ID)  
- Manual users: negative integer (`-Date.now()`)
- Supabase Auth uses: `UUID`

### Tables with `user_id BIGINT` FK to `profiles(id)`
1. `activities` — `user_id BIGINT`
2. `user_quests` — `user_id BIGINT`
3. `user_rewards` — `user_id BIGINT`
4. `point_adjustments` — `user_id BIGINT` (no FK constraint, but stores bigint)
5. `notifications` — `user_id BIGINT`, `sender_id BIGINT`
6. `attendance` — `user_id BIGINT`
7. `user_responses` — `user_id BIGINT`
8. `survey_submissions` — `user_id BIGINT`
9. `qr_spots` — `created_by BIGINT`
10. `user_spot_claims` — `user_id BIGINT`
11. `doorprize_winners` — `user_id BIGINT`

### Auth Cookies Currently Used
- `strava_athlete_id` — holds `profiles.id` (bigint as string)
- `strava_access_token` — Strava API token
- `is_manual_user` — flag for manual users
- `manual_access_code` — alternative auth method

### Login Methods
- `/api/auth/standard-login` — username + password (plain text)
- `/api/auth/manual-login` — access code based
- `/api/auth/login` → `/api/auth/callback` — Strava OAuth

---

## Task 1: Install Dependencies & Setup Supabase SSR

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts` (overwrite existing)
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Step 1: Install `@supabase/ssr`**

```bash
npm install @supabase/ssr
```

**Step 2: Create server-side Supabase client helper**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// Admin client that bypasses RLS — use only in trusted server-side code
export function createSupabaseAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Step 3: Update browser client**

Overwrite `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Legacy export for backward compatibility during migration
export const supabase = createSupabaseBrowserClient()
```

**Step 4: Create middleware helper**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users trying to access dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 5: Create Next.js middleware**

Create `src/middleware.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth API routes need to be accessible)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|api/auth/).*)',
  ],
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: install @supabase/ssr and setup auth infrastructure"
```

---

## Task 2: Database Migration — Add UUID, Create auth.users, Migrate FKs

> ⚠️ **CRITICAL**: This is a destructive migration. Back up the database first!
> Run `pg_dump` or use Supabase Dashboard → Database → Backups before proceeding.

**Files:**
- Create: `supabase/migrations/20260212000001_migrate_to_supabase_auth.sql`

**Step 1: Create the migration SQL**

This migration does the following in order:
1. Add `auth_id UUID` column to `profiles`
2. Create `auth.users` entries for each existing profile (with username as email pattern)
3. Link `profiles.auth_id` → `auth.users.id`
4. Add `auth_id UUID` column to all child tables
5. Populate new UUID columns from the mapping
6. Drop old BIGINT FK constraints
7. Make `auth_id` the new primary key path

```sql
-- ============================================================
-- MIGRATION: Custom Auth (BIGINT) → Supabase Auth (UUID)
-- ============================================================
-- STRATEGY: We keep profiles.id as BIGINT for backward compat,
-- but ADD a new `auth_id UUID` column that references auth.users.
-- All child tables get their user_id type changed from BIGINT to UUID.
-- ============================================================

-- STEP 0: Add auth_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- STEP 1: Create auth.users for each existing profile
-- We use the admin API via a DO block with the Supabase auth schema.
-- Each user gets: email = username@wam.local, password = existing password or 'Welcome123!'
DO $$
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    FOR r IN SELECT id, username, password, full_name, avatar_url 
             FROM public.profiles 
             WHERE auth_id IS NULL
    LOOP
        -- Generate a UUID for this user
        new_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            aud,
            role
        ) VALUES (
            new_id,
            '00000000-0000-0000-0000-000000000000',
            COALESCE(r.username, 'user_' || ABS(r.id)) || '@wam.local',
            crypt(COALESCE(r.password, 'Welcome123!'), gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', COALESCE(r.full_name, r.username),
                'legacy_id', r.id
            ),
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
        
        -- Also insert identity record
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            created_at,
            updated_at
        ) VALUES (
            new_id,
            new_id,
            jsonb_build_object(
                'sub', new_id::text,
                'email', COALESCE(r.username, 'user_' || ABS(r.id)) || '@wam.local'
            ),
            'email',
            new_id::text,
            NOW(),
            NOW()
        );
        
        -- Link back to profile
        UPDATE public.profiles SET auth_id = new_id WHERE id = r.id;
    END LOOP;
END $$;

-- STEP 2: Add new UUID columns to all child tables
-- We add alongside existing BIGINT columns, then populate, then swap.

-- activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.activities a SET user_auth_id = p.auth_id FROM public.profiles p WHERE a.user_id = p.id;

-- user_quests
ALTER TABLE public.user_quests ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.user_quests uq SET user_auth_id = p.auth_id FROM public.profiles p WHERE uq.user_id = p.id;

-- user_rewards
ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.user_rewards ur SET user_auth_id = p.auth_id FROM public.profiles p WHERE ur.user_id = p.id;

-- point_adjustments
ALTER TABLE public.point_adjustments ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.point_adjustments pa SET user_auth_id = p.auth_id FROM public.profiles p WHERE pa.user_id = p.id;
ALTER TABLE public.point_adjustments ADD COLUMN IF NOT EXISTS admin_auth_id UUID;
UPDATE public.point_adjustments pa SET admin_auth_id = p.auth_id FROM public.profiles p WHERE pa.admin_id = p.id;

-- notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.notifications n SET user_auth_id = p.auth_id FROM public.profiles p WHERE n.user_id = p.id;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_auth_id UUID;
UPDATE public.notifications n SET sender_auth_id = p.auth_id FROM public.profiles p WHERE n.sender_id = p.id;

-- attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.attendance a SET user_auth_id = p.auth_id FROM public.profiles p WHERE a.user_id = p.id;

-- user_responses
ALTER TABLE public.user_responses ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.user_responses ur SET user_auth_id = p.auth_id FROM public.profiles p WHERE ur.user_id = p.id;

-- survey_submissions
ALTER TABLE public.survey_submissions ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.survey_submissions ss SET user_auth_id = p.auth_id FROM public.profiles p WHERE ss.user_id::bigint = p.id;

-- qr_spots
ALTER TABLE public.qr_spots ADD COLUMN IF NOT EXISTS created_by_auth_id UUID;
UPDATE public.qr_spots qs SET created_by_auth_id = p.auth_id FROM public.profiles p WHERE qs.created_by = p.id;

-- user_spot_claims
ALTER TABLE public.user_spot_claims ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.user_spot_claims usc SET user_auth_id = p.auth_id FROM public.profiles p WHERE usc.user_id = p.id;

-- doorprize_winners
ALTER TABLE public.doorprize_winners ADD COLUMN IF NOT EXISTS user_auth_id UUID;
UPDATE public.doorprize_winners dw SET user_auth_id = p.auth_id FROM public.profiles p WHERE dw.user_id = p.id;

-- STEP 3: Once validated, we rename columns.
-- Keep old bigint as `legacy_user_id`, rename new UUID to `user_id`.
-- This will be done in a SEPARATE migration after validating Step 2 data.
```

**Step 2: Create the column swap migration (run after validation)**

Create `supabase/migrations/20260212000002_finalize_uuid_swap.sql`:

```sql
-- ============================================================
-- FINALIZE: Swap BIGINT columns with UUID columns
-- Run ONLY after validating 20260212000001 data is correct!
-- ============================================================

-- PROFILES: Make auth_id the referenced column
-- Keep bigint `id` as `legacy_id` for reference
ALTER TABLE public.profiles RENAME COLUMN id TO legacy_id;
ALTER TABLE public.profiles RENAME COLUMN auth_id TO id;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- Add FK to auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ACTIVITIES: Swap user_id columns
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE public.activities RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.activities RENAME COLUMN user_auth_id TO user_id;

-- USER_QUESTS: Swap
ALTER TABLE public.user_quests DROP CONSTRAINT IF EXISTS user_quests_user_id_fkey;
DROP INDEX IF EXISTS idx_user_quests_user;
ALTER TABLE public.user_quests RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.user_quests RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.user_quests DROP CONSTRAINT IF EXISTS user_quests_user_id_quest_id_key;
ALTER TABLE public.user_quests ADD CONSTRAINT user_quests_user_id_quest_id_key UNIQUE (user_id, quest_id);

-- USER_REWARDS: Swap
ALTER TABLE public.user_rewards DROP CONSTRAINT IF EXISTS user_rewards_user_id_fkey;
DROP INDEX IF EXISTS idx_user_rewards_user_id;
ALTER TABLE public.user_rewards RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.user_rewards RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.user_rewards DROP CONSTRAINT IF EXISTS user_rewards_user_id_reward_id_key;
ALTER TABLE public.user_rewards ADD CONSTRAINT user_rewards_user_id_reward_id_key UNIQUE (user_id, reward_id);

-- POINT_ADJUSTMENTS: Swap
DROP INDEX IF EXISTS idx_point_adjustments_user_id;
ALTER TABLE public.point_adjustments RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.point_adjustments RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.point_adjustments RENAME COLUMN admin_id TO legacy_admin_id;
ALTER TABLE public.point_adjustments RENAME COLUMN admin_auth_id TO admin_id;

-- NOTIFICATIONS: Swap
DROP INDEX IF EXISTS idx_notifications_user_id;
ALTER TABLE public.notifications RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.notifications RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.notifications RENAME COLUMN sender_id TO legacy_sender_id;
ALTER TABLE public.notifications RENAME COLUMN sender_auth_id TO sender_id;

-- ATTENDANCE: Swap
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_activity_id_user_id_key;
ALTER TABLE public.attendance RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.attendance RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_activity_id_user_id_key UNIQUE (activity_id, user_id);

-- USER_RESPONSES: Swap
ALTER TABLE public.user_responses RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.user_responses RENAME COLUMN user_auth_id TO user_id;

-- SURVEY_SUBMISSIONS: Swap
ALTER TABLE public.survey_submissions RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.survey_submissions RENAME COLUMN user_auth_id TO user_id;

-- QR_SPOTS: Swap
ALTER TABLE public.qr_spots RENAME COLUMN created_by TO legacy_created_by;
ALTER TABLE public.qr_spots RENAME COLUMN created_by_auth_id TO created_by;

-- USER_SPOT_CLAIMS: Swap
ALTER TABLE public.user_spot_claims DROP CONSTRAINT IF EXISTS user_spot_claims_user_id_fkey;
ALTER TABLE public.user_spot_claims DROP CONSTRAINT IF EXISTS user_spot_claims_user_id_spot_id_key;
ALTER TABLE public.user_spot_claims RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.user_spot_claims RENAME COLUMN user_auth_id TO user_id;
ALTER TABLE public.user_spot_claims ADD CONSTRAINT user_spot_claims_user_id_spot_id_key UNIQUE (user_id, spot_id);

-- DOORPRIZE_WINNERS: Swap
ALTER TABLE public.doorprize_winners DROP CONSTRAINT IF EXISTS doorprize_winners_user_id_fkey;
ALTER TABLE public.doorprize_winners DROP CONSTRAINT IF EXISTS unique_winner_per_activity;
ALTER TABLE public.doorprize_winners RENAME COLUMN user_id TO legacy_user_id;
ALTER TABLE public.doorprize_winners RENAME COLUMN user_auth_id TO user_id;

-- RECREATE INDEXES with UUID columns
CREATE INDEX IF NOT EXISTS idx_user_quests_user ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_user_id ON public.point_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spot_claims_user ON public.user_spot_claims(user_id);

-- ADD FK constraints for UUID columns
ALTER TABLE public.activities ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_quests ADD CONSTRAINT user_quests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_rewards ADD CONSTRAINT user_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_spot_claims ADD CONSTRAINT user_spot_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.doorprize_winners ADD CONSTRAINT doorprize_winners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add Strava-specific columns to profiles (for "Connect Strava" feature)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_athlete_id BIGINT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_expires_at BIGINT;

-- Migrate existing Strava data
UPDATE public.profiles 
SET strava_athlete_id = legacy_id,
    strava_access_token = access_token,
    strava_refresh_token = refresh_token,
    strava_expires_at = expires_at
WHERE access_token IS NOT NULL;

-- NOTIFY schema reload
NOTIFY pgrst, 'reload config';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: database migration from BIGINT to UUID auth"
```

---

## Task 3: Update Auth API Routes

**Files:**
- Modify: `src/app/api/auth/standard-login/route.ts`
- Modify: `src/app/api/auth/manual-login/route.ts`
- Modify: `src/app/api/auth/callback/route.ts` (Strava → "Connect Strava")
- Modify: `src/app/api/auth/login/route.ts` (Strava redirect)
- Modify: `src/app/api/auth/logout/route.ts`
- Delete: `src/app/auth/callback/route.ts` (old unused Supabase callback)

**Step 1: Rewrite `standard-login/route.ts`**

Replace cookie-based login with `supabase.auth.signInWithPassword()`:

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username/Password required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Sign in with email (username@wam.local pattern)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@wam.local`,
      password: password,
    })

    if (error) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

**Step 2: Rewrite `manual-login/route.ts`**

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessCode } = await request.json()

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code required' }, { status: 400 })
    }

    const adminClient = createSupabaseAdminClient()

    // Find user by access code
    const { data: user, error } = await adminClient
      .from('profiles')
      .select('id, username, password')
      .eq('access_code', accessCode)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Sign in via Supabase Auth using the found user's credentials
    const supabase = await createSupabaseServerClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${user.username}@wam.local`,
      password: user.password || 'Welcome123!',
    })

    if (signInError) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Manual Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

**Step 3: Rewrite `logout/route.ts`**

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const url = new URL('/', request.url)
  return NextResponse.redirect(url)
}
```

**Step 4: Update Strava flow to "Connect Strava" (link to existing account)**

Rewrite `src/app/api/auth/callback/route.ts`:

```typescript
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?error=missing_code`)
  }

  try {
    // 1. Exchange code for Strava tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.errors) throw new Error(JSON.stringify(tokenData))

    const { athlete, access_token, refresh_token, expires_at } = tokenData

    // 2. Get current logged-in user
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/?error=not_logged_in`)
    }

    // 3. Update profile with Strava data
    const adminClient = createSupabaseAdminClient()
    const { error: upsertError } = await adminClient
      .from('profiles')
      .update({
        strava_athlete_id: athlete.id,
        strava_access_token: access_token,
        strava_refresh_token: refresh_token,
        strava_expires_at: expires_at,
        avatar_url: athlete.profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (upsertError) {
      console.error('Strava Link Error:', upsertError)
      throw upsertError
    }

    return NextResponse.redirect(`${origin}/dashboard?strava=connected`)
  } catch (error) {
    console.error('Strava Connect Error:', error)
    return NextResponse.redirect(`${origin}/dashboard?error=strava_failed`)
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate auth routes to Supabase Auth"
```

---

## Task 4: Create Auth Helper Utility for API Routes

**Files:**
- Modify: `src/utils/auth.ts`

**Step 1: Rewrite auth utility**

Replace the old permission check (which reads from profiles using a passed userId) with one that gets the user from the Supabase session:

```typescript
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export type Permission = 
  | '*' 
  | 'manage_users' 
  | 'manage_points' 
  | 'manage_rewards' 
  | 'view_activity'
  | 'manage_admins'
  | 'manage_content';

export async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function hasPermission(
  userId: string, 
  requiredPermission: Permission
): Promise<boolean> {
  if (!userId) return false

  const adminClient = createSupabaseAdminClient()
  const { data: user, error } = await adminClient
    .from('profiles')
    .select('permissions, is_admin')
    .eq('id', userId)
    .single()

  if (error || !user) return false

  const permissions: string[] = user.permissions || []
  if (permissions.includes('*')) return true
  return permissions.includes(requiredPermission)
}

export async function verifyAdminPermission(
  requiredPermission: Permission
): Promise<{ authorized: boolean; userId?: string; errorResponse?: any }> {
  const user = await getAuthUser()
  
  if (!user) {
    return { authorized: false, errorResponse: { error: 'Unauthorized' } }
  }

  const authorized = await hasPermission(user.id, requiredPermission)
  
  if (!authorized) {
    return { 
      authorized: false, 
      errorResponse: { error: 'Forbidden: Insufficient permissions' }
    }
  }

  return { authorized: true, userId: user.id }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: update auth utility for Supabase Auth"
```

---

## Task 5: Migrate ALL API Routes (Bulk)

This is the largest task. Every API route needs two changes:
1. Replace `cookieStore.get('strava_athlete_id')` → `getAuthUser()`
2. Replace `createClient(URL, SERVICE_ROLE_KEY)` → either `createSupabaseServerClient()` (for user-context) or `createSupabaseAdminClient()` (for admin operations)

**Pattern — Before:**
```typescript
const cookieStore = await cookies()
const userId = cookieStore.get('strava_athlete_id')?.value
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Pattern — After:**
```typescript
import { getAuthUser } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const user = await getAuthUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const userId = user.id

const supabase = createSupabaseAdminClient()
```

**Files to modify (complete list):**

User routes:
- `src/app/api/user/update-background/route.ts`
- `src/app/api/user/update-avatar/route.ts`
- `src/app/api/user/scan/route.ts`
- `src/app/api/user/message/route.ts`

Survey routes:
- `src/app/api/surveys/submit/route.ts`
- `src/app/api/surveys/[id]/route.ts`
- `src/app/api/survey/route.ts`

Strava route:
- `src/app/api/strava/sync/route.ts` (major rewrite — Strava data now lives on profiles.strava_* columns)

Reward routes:
- `src/app/api/rewards/list/route.ts`
- `src/app/api/rewards/claim/route.ts`
- `src/app/api/rewards/reroll/route.ts`
- `src/app/api/rewards/reveal-clues/route.ts`
- `src/app/api/rewards/background-gacha/route.ts`

Quest routes:
- `src/app/api/quests/claim/route.ts`

Profile routes:
- `src/app/api/profile/update/route.ts`

Notification routes:
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/mark-read/route.ts`

Integration routes:
- `src/app/api/integrations/get-key/route.ts`
- `src/app/api/integrations/apple-health/route.ts`

Leaderboard:
- `src/app/api/leaderboard/route.ts`

Spot routes:
- `src/app/api/spots/scan/route.ts`
- `src/app/api/spots/clues/route.ts`

Recommendation:
- `src/app/api/recommendations/route.ts`

Admin routes (use `verifyAdminPermission()` instead of manual cookie check):
- `src/app/api/admin/users/list/route.ts`
- `src/app/api/admin/users/create/route.ts`
- `src/app/api/admin/users/delete/route.ts`
- `src/app/api/admin/users/points/route.ts`
- `src/app/api/admin/users/steps/route.ts`
- `src/app/api/admin/users/reset/route.ts`
- `src/app/api/admin/surveys/*` (all survey admin routes)
- `src/app/api/admin/rewards/*` (all reward admin routes)
- `src/app/api/admin/quests/*` (all quest admin routes)
- `src/app/api/admin/spots/route.ts`
- `src/app/api/admin/spots/detail/route.ts`
- `src/app/api/admin/admins/route.ts`
- `src/app/api/admin/activities/*`
- `src/app/api/admin/attendance/*`
- `src/app/api/admin/doorprize/*`

**Special Case: `admin/users/create/route.ts`**

When admin creates a new user, we now also create an `auth.users` entry:

```typescript
// Instead of inserting directly to profiles with negative bigint ID:
const adminClient = createSupabaseAdminClient()

// Create auth user first
const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
  email: `${username}@wam.local`,
  password: password,
  email_confirm: true,
  user_metadata: { full_name: fullName || username }
})

if (authError) throw authError

// Then create profile linked to auth user
const { error } = await adminClient
  .from('profiles')
  .insert({
    id: authUser.user.id, // UUID from auth.users
    username,
    full_name: fullName || username,
    avatar_url: avatarUrl,
    gender: gender || null,
    is_manual: true,
    access_code: `CODE-${Math.floor(Math.random() * 9000) + 1000}`,
    password: password, // Keep for manual-login backward compat (temporary)
  })
```

**Special Case: `admin/users/delete/route.ts`**

Also delete from `auth.users`:
```typescript
// After deleting from profiles:
await adminClient.auth.admin.deleteUser(id) // id is now UUID
```

**Commit after each group of routes (user, admin, rewards, etc.)**

---

## Task 6: Update Frontend Components

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/LoginForm.tsx`
- Modify: `src/components/CustomAuthModal.tsx`
- Modify: `src/app/dashboard/admin/page.tsx`

**Step 1: Update `page.tsx` (root page)**

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black overflow-hidden relative">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
        <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
      </div>
      <LoginForm />
    </main>
  )
}
```

**Step 2: Update `LoginForm.tsx`**

No change needed — it already calls `/api/auth/standard-login` which we've updated.

**Step 3: Update admin page**

Remove the commented-out `supabase.auth.getUser()` / `supabase.auth.getSession()` code and replace with proper auth check.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: update frontend for Supabase Auth"
```

---

## Task 7: Add RLS Policies

**Files:**
- Create: `supabase/migrations/20260212000003_add_rls_policies.sql`

Now that `auth.uid()` works, we can add proper RLS policies:

```sql
-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ACTIVITIES 
CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT WITH CHECK (user_id = auth.uid());

-- USER_QUESTS
CREATE POLICY "Users can view own quests" ON public.user_quests FOR SELECT USING (user_id = auth.uid());

-- USER_REWARDS  
CREATE POLICY "Users can view own rewards" ON public.user_rewards FOR SELECT USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Note: Service Role still bypasses all RLS, so admin routes remain unaffected.
```

---

## Task 8: Testing & Validation Checklist

After all code changes:

1. **Login flow**: Try standard login with existing username/password → should get Supabase JWT session
2. **Dashboard**: After login, `/dashboard` should load with user data
3. **Admin**: Admin user should be able to access admin panel and all CRUD operations
4. **Create User**: Admin creates new user → should create `auth.users` + `profiles` entry
5. **Delete User**: Should cascade properly
6. **Points/Coins**: Existing user's points, steps, coins should be preserved
7. **Strava Connect**: Logged-in user can connect Strava account
8. **Logout**: Should clear Supabase session
9. **Build**: `npm run build` should pass without errors

---

## Summary of Impact

| Before | After |
|---|---|
| Cookie `strava_athlete_id` (BIGINT) | Supabase JWT session (UUID) |
| `profiles.id` = BIGINT | `profiles.id` = UUID (FK to `auth.users`) |  
| Password: plain text in profiles | Password: bcrypt-hashed in `auth.users` |
| All routes: Service Role Key | User routes: Anon Key + JWT; Admin routes: Service Role Key |
| RLS: Effectively disabled | RLS: Properly enforced via `auth.uid()` |
| Strava: Primary login method | Strava: "Connect" feature (optional) |
| Session security: Forgeable cookie | Session security: Signed JWT |
