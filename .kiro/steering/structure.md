# Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── admin/         # Admin-only endpoints (require permissions)
│   │   ├── auth/          # Authentication (login, callback, logout)
│   │   ├── quests/        # Quest claiming
│   │   ├── rewards/       # Rewards system
│   │   ├── surveys/       # Survey submission
│   │   ├── user/          # User profile operations
│   │   └── ...
│   ├── dashboard/         # Main user dashboard
│   │   └── admin/         # Admin panel pages
│   ├── leaderboard/       # Leaderboard page
│   ├── profile/           # User profile pages
│   ├── quests/            # Quests listing
│   ├── rewards/           # Rewards shop
│   ├── survey/            # Survey pages
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── mobile/            # Mobile-specific components (BottomNav)
│   ├── survey/            # Survey-related components
│   ├── ui/                # Reusable UI components (Loader, Toast)
│   └── ...                # Feature components
├── context/               # React contexts (ToastContext)
├── hooks/                 # Custom hooks (SWR hooks)
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── strava/            # Strava API service
│   └── utils.ts           # Utility functions
└── utils/
    └── auth.ts            # Permission checking utilities

supabase/
└── migrations/            # Database migrations (chronological)

scripts/                   # Admin/debug scripts (TypeScript)
```

## Key Patterns

### API Routes
- Use `createClient` with Service Role key for admin operations
- Check permissions via `verifyAdminPermission()` from `@/utils/auth`
- Return `NextResponse.json()` with appropriate status codes
- Export `dynamic = 'force-dynamic'` for non-cacheable routes

### Authentication
- Cookie-based auth using `strava_athlete_id` cookie
- User IDs are stored as BIGINT (Strava athlete IDs)
- Permissions stored in `profiles.permissions` array

### Components
- Use `'use client'` directive for interactive components
- Fetch data via SWR hooks from `@/hooks/use-swr-hooks`
- Use Framer Motion for animations
- Mobile-first design with Tailwind

### Database
- All tables use Row Level Security (RLS)
- API routes use Service Role to bypass RLS when needed
- Migrations are timestamped and sequential
