# Code Cleanup Notes - City Tour Map

## Removed Files (Task 14.4)

### Strava Integration Components
- **src/components/ConnectStravaBtn.tsx** - Removed unused Strava connection button component
- **src/lib/strava/service.ts** - Removed Strava API service (not used in city tour)

## Legacy Code Retained

The following Strava-related code has been retained as it's still used by the legacy wellness app features:

### Authentication Routes
- `/api/auth/login` - Strava OAuth initiation
- `/api/auth/callback` - Strava OAuth callback
- `/api/auth/standard-login` - Username/password login (actively used)
- `/api/auth/manual-login` - Manual login flow

### Session Management
- Cookie `strava_athlete_id` - Used for session management across both legacy and city tour features
- This cookie name is legacy but is reused for the city tour authentication system

### Components Still in Use
- **AddActivityBtn** - Used in dashboard for manual activity entry
- **DailyQuests** - Used in quests page and dashboard
- **CustomAuthModal** - Used for custom Strava credentials

### API Routes
- `/api/strava/sync` - Still used by useProfile and useQuests hooks for legacy features

## City Tour Specific Features

The city tour uses its own authentication system:
- `/api/tour/auth/register` - Simple registration with name and photo
- `/api/tour/auth/me` - Session validation
- `/api/tour/auth/logout` - Logout
- `participant_id` cookie - City tour session management

## Recommendations for Future Cleanup

If the legacy wellness features are to be fully deprecated:
1. Remove all Strava OAuth routes (`/api/auth/login`, `/api/auth/callback`)
2. Remove `/api/strava/sync` route
3. Remove AddActivityBtn, DailyQuests, CustomAuthModal components
4. Remove quests-related database tables and migrations
5. Rename `strava_athlete_id` cookie to `user_id` or `session_id` for clarity
6. Remove Strava environment variables from configuration
