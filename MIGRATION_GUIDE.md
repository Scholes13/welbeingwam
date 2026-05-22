# City Tour Database Migration Guide

## Current Status

✅ **Migration files created** (Tasks 1.1-1.8 completed)
✅ **Migrations successfully applied to remote database** (Task 2 completed)

All city tour database tables, functions, views, and seed data are now live!

## How to Apply Migrations

### Option 1: Supabase Dashboard SQL Editor (RECOMMENDED)

1. Go to your Supabase SQL Editor:
   **https://supabase.com/dashboard/project/ihrutobdomnagnwzwncy/sql**

2. Apply each migration file in order:

   **Step 1:** Copy content from `supabase/migrations/20260129000000_city_tour_schema.sql`
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success message

   **Step 2:** Copy content from `supabase/migrations/20260129000001_check_in_spot_function.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

   **Step 3:** Copy content from `supabase/migrations/20260129000002_evaluate_badges_trigger.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

   **Step 4:** Copy content from `supabase/migrations/20260129000003_leaderboard_view.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

   **Step 5:** Copy content from `supabase/migrations/20260129000004_seed_default_data.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

3. Verify the setup by running:
   ```bash
   npm run verify-db
   ```

### Option 2: Supabase CLI with Database Password

If you have your database password:

```bash
# Set your database password
$env:SUPABASE_DB_PASSWORD="your-database-password"

# Push migrations
npx supabase db push
```

## Verification

After applying migrations, run the verification script:

```bash
$env:NEXT_PUBLIC_SUPABASE_URL="https://ihrutobdomnagnwzwncy.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npx tsx scripts/verify_database.ts
```

Expected output:
```
✅ PostGIS extension is enabled
✅ All 8 tables exist
✅ 6 default categories seeded
✅ 8 default badges seeded
✅ 8 default settings seeded
✅ leaderboard_view exists
```

## What Gets Created

### Tables
- `participants` - Tour participants with points
- `categories` - Quest spot categories (Historical, Culinary, etc.)
- `quest_spots` - Physical locations with GPS coordinates
- `visits` - Check-in records
- `badges` - Achievement definitions
- `participant_badges` - Earned badges
- `tour_sessions` - Event time windows
- `settings` - Feature toggles and point values

### Functions
- `check_in_spot()` - Server-side GPS validation and check-in processing
- `evaluate_badges()` - Automatic badge award trigger

### Views
- `leaderboard_view` - Ranked participants with tiebreaker logic

### Default Data
- 6 categories (Historical, Culinary, Art, Nature, Shopping, Photo Spot)
- 8 badges (6 category streaks + Speed Demon + Completion)
- 8 settings (point values and feature toggles)

## Troubleshooting

### "Table already exists" error
- Some tables may already exist from previous migrations
- You can safely ignore these errors or drop the tables first

### "PostGIS extension not found"
- Make sure you're on a Supabase plan that supports PostGIS
- Contact Supabase support if needed

### Permission errors
- Make sure you're using the correct service role key
- Check that your Supabase project is active

## Next Steps

After migrations are applied:
1. ✅ Mark Task 2 (Checkpoint) as complete
2. ➡️ Continue to Task 3: Setup Core Application Infrastructure
