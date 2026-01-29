# Tech Stack

## Core Framework
- Next.js 16 (App Router)
- React 19
- TypeScript 5 (strict mode)

## Styling
- Tailwind CSS 3.4
- Framer Motion for animations
- Lucide React for icons

## Backend & Database
- Supabase (PostgreSQL with Row Level Security)
- Supabase Auth (custom OAuth flow with Strava)
- Service Role key for admin operations

## Data Fetching
- SWR for client-side data fetching and caching
- Next.js API routes for server endpoints

## Deployment
- Cloudflare Pages via OpenNext adapter
- Wrangler CLI for deployment

## Key Libraries
- `@supabase/supabase-js` - Database client
- `@yudiel/react-qr-scanner` - QR code scanning
- `react-qr-code` - QR code generation
- `canvas-confetti` - Celebration effects
- `date-fns` - Date utilities
- `nanoid` - ID generation
- `clsx` + `tailwind-merge` - Class utilities

## Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Cloudflare Pages build
npm run pages:build

# Deploy to Cloudflare
npm run pages:deploy
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Strava OAuth credentials (if using Strava integration)
