# Authentication Flow Verification Checklist

This document provides a manual testing checklist for the City Tour authentication flow.

## Prerequisites

1. ✅ Database schema created (participants table)
2. ✅ Environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`

## Implementation Verification

### ✅ Task 4.1: Simple Login API Route
- [x] POST `/api/tour/auth/register` endpoint created
- [x] Accepts `name`, `gender`, and optional `photo_url`
- [x] Generates unique participant code using nanoid (8 characters)
- [x] Creates session cookie (`participant_id`)
- [x] Gender-specific avatar generation using Dicebear
- [x] Returns participant data on success

**Key Features:**
- Name validation (minimum 2 characters)
- Unique code generation with retry logic (max 10 attempts)
- Gender-specific avatar tops (male/female)
- 7-day session cookie with httpOnly and secure flags

### ✅ Task 4.2: Property Test for Participant Code Uniqueness
- [ ] Property test not implemented (marked as optional with *)
- Note: This is an optional task and can be skipped for MVP

### ✅ Task 4.3: Logout API Route
- [x] POST `/api/tour/auth/logout` endpoint created
- [x] Clears `participant_id` session cookie
- [x] Returns success response

### ✅ Task 4.4: Login Page UI
- [x] `TourLoginForm` component created
- [x] Name input field with validation
- [x] Gender selection (Male/Female buttons)
- [x] Gender-specific avatar styles
- [x] Redirects to `/map` on successful registration
- [x] Error handling and display
- [x] Loading states

**UI Features:**
- Gradient background with ambient effects
- Form validation (name length check)
- Disabled state when name is too short
- Smooth animations with Framer Motion

### ✅ Task 4.5: Auth Middleware
- [x] `tour-auth.ts` utility created with:
  - `getCurrentParticipant()` - Get current participant from cookie
  - `verifyAdmin()` - Verify admin access
  - `getParticipantId()` - Quick cookie check
- [x] GET `/api/tour/auth/me` endpoint for session validation
- [x] Returns participant data or 401 error

## Manual Testing Steps

### Test 1: New User Registration

1. Navigate to `/tour` page
2. Enter a name (at least 2 characters)
3. Select a gender (optional)
4. Click "Start Exploring"
5. **Expected Result:**
   - Redirected to `/map` page
   - User info displayed in top-right corner
   - Session cookie set in browser

### Test 2: Name Validation

1. Navigate to `/tour` page
2. Enter a single character name
3. Try to submit
4. **Expected Result:**
   - Submit button should be disabled
   - No API call made

### Test 3: Session Persistence

1. Register a new user
2. Refresh the page
3. **Expected Result:**
   - User remains logged in
   - Redirected to `/map` if on `/tour` page

### Test 4: Session Validation

1. Open browser DevTools
2. Delete the `participant_id` cookie
3. Try to access `/map` page
4. **Expected Result:**
   - Redirected to `/tour` login page

### Test 5: Logout Flow

1. Login as a user
2. Call POST `/api/tour/auth/logout`
3. Try to access `/map` page
4. **Expected Result:**
   - Cookie cleared
   - Redirected to login page

### Test 6: Gender-Specific Avatars

1. Register with gender "male"
2. Note the avatar URL
3. Register with gender "female"
4. Note the avatar URL
5. **Expected Result:**
   - Both avatars should use Dicebear API
   - URLs should contain different `top` parameters

### Test 7: Unique Participant Codes

1. Register multiple users
2. Check the database for participant codes
3. **Expected Result:**
   - All codes should be unique
   - All codes should be 8 characters, uppercase alphanumeric

## Database Verification

Run these queries in Supabase SQL Editor:

```sql
-- Check participants table
SELECT id, code, name, profile_photo_url, total_points, is_admin, created_at
FROM participants
ORDER BY created_at DESC
LIMIT 10;

-- Verify code uniqueness
SELECT code, COUNT(*) as count
FROM participants
GROUP BY code
HAVING COUNT(*) > 1;
-- Should return no rows

-- Check avatar URLs
SELECT name, profile_photo_url
FROM participants
WHERE profile_photo_url LIKE '%dicebear%';
```

## API Testing with cURL

### Register a new participant:
```bash
curl -X POST http://localhost:3000/api/tour/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "gender": "male"}'
```

### Check session:
```bash
curl http://localhost:3000/api/tour/auth/me \
  -H "Cookie: participant_id=YOUR_PARTICIPANT_ID"
```

### Logout:
```bash
curl -X POST http://localhost:3000/api/tour/auth/logout \
  -H "Cookie: participant_id=YOUR_PARTICIPANT_ID"
```

## Known Issues / Notes

1. **Mapbox Token Required**: The map page requires a valid Mapbox token in `.env.local`
2. **Database Connection**: Ensure Supabase is accessible and migrations are applied
3. **Service Role Key**: Required for participant creation (bypasses RLS)
4. **Cookie Security**: In production, cookies use `secure: true` flag

## Success Criteria

- ✅ Users can register with name and optional gender
- ✅ Unique participant codes are generated
- ✅ Session cookies are set correctly
- ✅ Gender-specific avatars are generated
- ✅ Users are redirected to map after registration
- ✅ Session validation works on protected routes
- ✅ Logout clears session properly
- ✅ Auth middleware functions work correctly

## Next Steps

After verifying the auth flow:
1. Proceed to Task 6: Implement Quest Spots API and Map Display
2. Test the full user journey from login to map interaction
3. Consider adding optional property-based tests for code uniqueness
