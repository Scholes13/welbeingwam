---
inclusion: always
---

# City Tour Map

Interactive city tour app dengan gamifikasi untuk event komunitas. Peserta menjelajahi kota, check-in di lokasi quest menggunakan GPS, dan bersaing di leaderboard real-time.

## Core Features

- **Interactive Map**: Mapbox GL JS dengan quest spot markers dan category filtering
- **GPS Check-in**: Server-side validation menggunakan PostGIS st_dwithin
- **QR Scanning**: Check-in via QR code di lokasi (toggleable)
- **Photo Bonus**: Upload foto saat check-in untuk bonus poin (toggleable)
- **Streak Badges**: Penghargaan untuk pola kunjungan (toggleable)
- **Real-time Leaderboard**: Supabase Realtime dengan tiebreaker by timestamp (toggleable)
- **Rewards Shop**: Gacha mechanics dan claimable prizes dengan poin (toggleable)
- **Surveys**: Kuesioner untuk feedback dan rekomendasi (toggleable)
- **Tour Session**: Time-bounded event dengan countdown timer
- **Admin Panel**: Quest spot CRUD, analytics, feature toggles, point configuration

## Design Principles

- Mobile-first untuk outdoor exploration
- Server-side validation untuk mencegah manipulasi (semua GPS check di database)
- Feature toggles via settings table (tanpa code changes)
- Graceful offline handling (cached map, retry on reconnect)
- Minimum 20m radius untuk mengakomodasi GPS drift

## User Flows

- **Authentication**: Simple login dengan nama + optional foto (tanpa Strava/OAuth)
- **Points Economy**: Earn via check-in (base + photo bonus) dan badge achievements
- **Admin Operations**: Require is_admin flag; use Service Role for database access

## Domain Terminology

- **Quest Spot**: Lokasi fisik dengan koordinat GPS, radius, dan kategori
- **Check-in**: Validasi kehadiran via PostGIS st_dwithin (server-side)
- **Badge**: Penghargaan untuk streak/milestone (category streak, speed demon, completion)
- **Tour Session**: Periode aktif event dengan start/end time
- **Feature Toggle**: On/off setting untuk fitur (photo_checkin, badges, leaderboard, category_filter)

## Legacy Code Reuse

Komponen yang tetap digunakan dari WAM25:
- Leaderboard page dan API (`/leaderboard`)
- Profile page structure (`/profile`)
- Admin dashboard layout (`/dashboard/admin`)
- QR scanning components dan API (`/api/spots/scan`, `/api/user/scan`)
- Rewards shop dan gacha system (`/rewards`, `/api/rewards/*`)
- Survey system (`/survey`, `/api/surveys/*`)
- Toast/Loader UI components
- SWR hooks pattern
- Supabase client setup
- Cookie-based session management

Komponen yang dimodifikasi:
- Strava integration → Simple login (nama + foto)
- Daily quests → Quest spots dengan lokasi GPS
- Check-in method → GPS-based + QR code (dual mode, toggleable)

Fitur toggleable via Super Admin:
- `qr_checkin` - QR code check-in
- `gps_checkin` - GPS-based check-in
- `photo_checkin` - Photo bonus saat check-in
- `badges` - Streak badges system
- `leaderboard` - Real-time leaderboard
- `rewards` - Rewards shop
- `surveys` - Survey/kuesioner
- `category_filter` - Filter spots by category
