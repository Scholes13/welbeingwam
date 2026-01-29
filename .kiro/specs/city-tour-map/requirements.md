# Requirements Document

## Introduction

City Tour Map adalah transformasi dari WAM25 Wellbeing App menjadi aplikasi interactive city tour dengan gamifikasi. Aplikasi ini dirancang untuk event 5 jam dengan 50 peserta, menggunakan Mapbox untuk visualisasi peta interaktif. Admin dapat mengelola quest spots dengan lokasi GPS, radius check-in, dan informasi detail. Peserta dapat menjelajahi kota, check-in di lokasi quest, dan mengumpulkan poin serta badges.

### Technical Context
- **Database**: Supabase dengan PostGIS extension untuk geospatial queries
- **Map Provider**: Mapbox GL JS dengan layer filtering dan custom symbols
- **Real-time**: Supabase Realtime untuk leaderboard updates
- **Scale**: 50 peserta, 5 jam event duration
- **Authentication**: Simple login (no Strava integration)
- **Feature Toggles**: Settings table untuk on/off fitur tanpa code changes

## Glossary

- **City_Tour_System**: Sistem utama aplikasi city tour map
- **Quest_Spot**: Lokasi fisik yang ditandai di peta sebagai tujuan kunjungan peserta, disimpan sebagai PostGIS geography point
- **Check_In**: Proses verifikasi kehadiran peserta di Quest_Spot menggunakan server-side PostGIS st_dwithin validation
- **Radius**: Jarak maksimum (dalam meter) dari koordinat Quest_Spot dimana peserta dapat melakukan Check_In, minimum 20 meter untuk mengakomodasi GPS drift
- **Admin**: Pengguna dengan hak akses untuk mengelola Quest_Spot dan konfigurasi sistem
- **Participant**: Pengguna yang mengikuti city tour dan mengunjungi Quest_Spot
- **Mapbox**: Layanan peta interaktif yang digunakan untuk visualisasi lokasi dengan layer filtering
- **GPS_Coordinates**: Pasangan latitude dan longitude yang menentukan lokasi geografis
- **Tour_Session**: Periode waktu aktif dimana peserta dapat melakukan Check_In (5 jam)
- **GeoJSON**: Format data geografis untuk menampilkan Quest_Spots di Mapbox
- **PostGIS**: PostgreSQL extension untuk operasi geospatial seperti st_dwithin
- **Badge**: Penghargaan visual yang diperoleh peserta saat mencapai milestone tertentu
- **Streak**: Pencapaian berdasarkan pola kunjungan berturut-turut atau dalam waktu tertentu
- **Feature_Toggle**: Pengaturan on/off untuk fitur tertentu yang dapat dikonfigurasi Admin tanpa mengubah kode
- **Point_Multiplier**: Faktor pengali poin yang dapat dikonfigurasi Admin

## Requirements

### Requirement 1: Interactive Map Display

**User Story:** As a Participant, I want to view an interactive map showing all quest spots immediately, so that I can plan my route efficiently without guessing locations.

#### Acceptance Criteria

1. WHEN a Participant opens the map page THEN the City_Tour_System SHALL display a Mapbox map with all active Quest_Spot markers visible immediately as a GeoJSON symbol layer
2. WHEN a Participant taps on a Quest_Spot marker THEN the City_Tour_System SHALL display a popup with the spot name, description, base points value, and category icon
3. WHILE the Participant has location permissions enabled THEN the City_Tour_System SHALL display the Participant current location with a pulsing animation marker that updates in real-time
4. WHEN the map loads THEN the City_Tour_System SHALL fit all Quest_Spot markers within the visible map bounds using Mapbox fitBounds
5. WHEN a Quest_Spot has been visited by the Participant THEN the City_Tour_System SHALL update the GeoJSON visited property to true and render that marker with a distinct completed style
6. IF the network connection is lost THEN the City_Tour_System SHALL display a connection status indicator and retain the last loaded map state until reconnection

### Requirement 2: GPS-Based Check-In with Server Validation

**User Story:** As a Participant, I want to check-in at quest spots using my GPS location with server-side validation, so that I can earn points securely.

#### Acceptance Criteria

1. WHEN a Participant submits a check-in request THEN the City_Tour_System SHALL validate the distance using PostGIS st_dwithin function on the server to prevent client-side manipulation
2. WHEN a Participant is within the defined Radius of a Quest_Spot (validated server-side) THEN the City_Tour_System SHALL enable the check-in and award base points according to configured Point_Multiplier
3. WHEN a Participant attempts to check-in outside the Radius THEN the City_Tour_System SHALL return an error with the calculated distance from PostGIS st_distance function
4. WHEN a Participant successfully checks in THEN the City_Tour_System SHALL record the visit with timestamp in the visits table for tiebreaker ranking
5. WHEN a Participant has already checked in at a Quest_Spot THEN the City_Tour_System SHALL prevent duplicate check-ins and display the previous visit timestamp
6. IF location services are disabled THEN the City_Tour_System SHALL prompt the Participant to enable GPS with clear instructions
7. WHEN configuring Radius for a Quest_Spot THEN the City_Tour_System SHALL enforce a minimum of 20 meters to accommodate urban GPS drift (5-15 meter accuracy variance)

### Requirement 3: Photo Check-In Bonus

**User Story:** As a Participant, I want to upload a photo when checking in, so that I can earn bonus points and document my visit.

#### Acceptance Criteria

1. WHERE the photo_checkin Feature_Toggle is enabled THEN the City_Tour_System SHALL display a photo upload option during check-in
2. WHEN a Participant uploads a photo with check-in THEN the City_Tour_System SHALL award bonus points according to the configured photo_bonus_points setting (default: +50 pts)
3. WHEN a Participant checks in without photo THEN the City_Tour_System SHALL award only the base points without bonus
4. WHEN a photo is uploaded THEN the City_Tour_System SHALL store the image in Supabase Storage and link the URL to the visit record
5. WHERE the photo_checkin Feature_Toggle is disabled THEN the City_Tour_System SHALL hide the photo upload option and process check-ins without photo capability

### Requirement 4: Admin Quest Spot Management

**User Story:** As an Admin, I want to create and manage quest spots with location, radius, and details, so that I can configure the tour experience.

#### Acceptance Criteria

1. WHEN an Admin creates a new Quest_Spot THEN the City_Tour_System SHALL require name, GPS_Coordinates stored as PostGIS geography point, Radius (20-500 meters), base points value, category, and description
2. WHEN an Admin sets GPS_Coordinates THEN the City_Tour_System SHALL allow selection via interactive map click with coordinate preview or manual latitude/longitude entry
3. WHEN an Admin configures Radius THEN the City_Tour_System SHALL display a visual circle overlay on the map preview showing the check-in zone
4. WHEN an Admin edits an existing Quest_Spot THEN the City_Tour_System SHALL preserve all visit history and update only the modified fields
5. WHEN an Admin deletes a Quest_Spot THEN the City_Tour_System SHALL require confirmation and perform soft-delete to preserve historical visit data
6. WHEN an Admin views the Quest_Spot list THEN the City_Tour_System SHALL display total visits count, active status, category, and creation date for each spot
7. WHEN an Admin uploads a category icon THEN the City_Tour_System SHALL store the icon in Supabase Storage and reference the URL for Mapbox symbol layer

### Requirement 5: Point Multiplier Configuration

**User Story:** As an Admin, I want to configure point values dynamically, so that I can adjust the scoring system without code changes.

#### Acceptance Criteria

1. WHEN an Admin accesses point settings THEN the City_Tour_System SHALL display configurable values for base_checkin_points (default: 50) and photo_bonus_points (default: 50)
2. WHEN an Admin updates point values THEN the City_Tour_System SHALL apply the new values to all subsequent check-ins immediately
3. WHEN displaying Quest_Spot information THEN the City_Tour_System SHALL show the current base points value from settings
4. WHEN calculating check-in rewards THEN the City_Tour_System SHALL use the current Point_Multiplier settings at the time of check-in

### Requirement 6: Streak-Based Badges and Milestones

**User Story:** As a Participant, I want to earn badges by completing streak challenges, so that I stay motivated throughout the tour.

#### Acceptance Criteria

1. WHEN a Participant visits 5 Quest_Spots of the same category consecutively THEN the City_Tour_System SHALL award the category-specific badge (e.g., "Sejarawan Kota" for Historical) with bonus points (default: 200 pts)
2. WHEN a Participant visits 10 Quest_Spots within the first hour of Tour_Session THEN the City_Tour_System SHALL award the "Speed Demon" badge with bonus points (default: 300 pts)
3. WHEN a badge is earned THEN the City_Tour_System SHALL display a celebration animation and notification to the Participant
4. WHEN a Participant views their profile THEN the City_Tour_System SHALL display all earned badges with timestamps
5. WHEN a check-in is recorded THEN the City_Tour_System SHALL execute a database trigger to evaluate streak conditions and award applicable badges
6. WHERE the badges Feature_Toggle is disabled THEN the City_Tour_System SHALL skip badge evaluation and hide badge displays

### Requirement 7: Tour Progress Tracking

**User Story:** As a Participant, I want to see my tour progress and visited spots, so that I can track my achievements during the event.

#### Acceptance Criteria

1. WHEN a Participant views their profile THEN the City_Tour_System SHALL display total points earned (including bonuses), spots visited count, spots remaining count, and earned badges
2. WHEN a Participant views the spots list THEN the City_Tour_System SHALL show visited spots with timestamps sorted by visit time, and unvisited spots with distance calculated from current location
3. WHEN a Participant completes all Quest_Spots THEN the City_Tour_System SHALL display a completion badge and trigger a celebration animation
4. WHILE the Tour_Session is active THEN the City_Tour_System SHALL update progress statistics immediately after each successful check-in

### Requirement 8: Admin Dashboard Analytics

**User Story:** As an Admin, I want to view real-time analytics of participant activity, so that I can monitor the tour progress and engagement.

#### Acceptance Criteria

1. WHEN an Admin views the dashboard THEN the City_Tour_System SHALL display total active participants, total check-ins count, and Quest_Spots ranked by visit count
2. WHEN an Admin views a specific Quest_Spot detail THEN the City_Tour_System SHALL display the chronological list of participants who visited with their check-in timestamps and photos if uploaded
3. WHEN an Admin views participant details THEN the City_Tour_System SHALL display that participant visited spots timeline, accumulated points, and earned badges
4. WHILE the Tour_Session is active THEN the City_Tour_System SHALL use Supabase Realtime subscription to update analytics without manual refresh

### Requirement 9: Quest Spot Categories with Mapbox Layers

**User Story:** As an Admin, I want to categorize quest spots by type with custom icons, so that participants can filter and identify spots visually.

#### Acceptance Criteria

1. WHEN an Admin creates a Quest_Spot THEN the City_Tour_System SHALL require selection of a category from configurable options with default set (Historical, Culinary, Art, Nature, Shopping, Photo Spot)
2. WHEN a Participant views the map THEN the City_Tour_System SHALL provide filter controls to show or hide Quest_Spots by category using Mapbox layer filtering
3. WHEN displaying Quest_Spot markers THEN the City_Tour_System SHALL render category-specific icons loaded from Supabase Storage as Mapbox symbol layers
4. WHEN an Admin manages categories THEN the City_Tour_System SHALL allow creating custom categories with name, icon upload, and color assignment

### Requirement 10: Real-time Leaderboard

**User Story:** As a Participant, I want to see a live leaderboard of top explorers, so that I can compete with other participants in real-time.

#### Acceptance Criteria

1. WHEN a Participant views the leaderboard THEN the City_Tour_System SHALL display participants ranked by total points in descending order, with visit timestamp as tiebreaker (earlier check-in ranks higher)
2. WHEN displaying leaderboard entries THEN the City_Tour_System SHALL show rank position, participant name, profile photo, total points, spots visited count, and badge count
3. WHEN any Participant completes a check-in THEN the City_Tour_System SHALL broadcast the update via Supabase Realtime and all connected clients SHALL reflect ranking changes within 5 seconds
4. WHEN a Participant views the leaderboard THEN the City_Tour_System SHALL highlight and auto-scroll to the current participant position
5. WHEN two participants have equal points THEN the City_Tour_System SHALL rank the participant with the earlier latest check-in timestamp higher

### Requirement 11: Tour Session Management

**User Story:** As an Admin, I want to control the tour session timing, so that check-ins are only valid during the event period.

#### Acceptance Criteria

1. WHEN an Admin configures a Tour_Session THEN the City_Tour_System SHALL require session name, start datetime, and end datetime with timezone
2. WHILE the current time is before Tour_Session start THEN the City_Tour_System SHALL display countdown timer and disable check-in functionality with clear messaging
3. WHILE the current time is after Tour_Session end THEN the City_Tour_System SHALL disable all check-in functionality and display final results summary
4. WHILE the Tour_Session is active THEN the City_Tour_System SHALL display remaining time countdown in the navigation header
5. WHEN an Admin views session settings THEN the City_Tour_System SHALL display session status (upcoming, active, ended) with relevant time information

### Requirement 12: Feature Toggle System

**User Story:** As an Admin, I want to enable or disable features without code changes, so that I can customize the app for different client needs.

#### Acceptance Criteria

1. WHEN an Admin accesses feature settings THEN the City_Tour_System SHALL display toggles for: photo_checkin, badges, leaderboard, category_filter
2. WHEN an Admin toggles a feature off THEN the City_Tour_System SHALL immediately hide related UI elements and disable related functionality
3. WHEN an Admin toggles a feature on THEN the City_Tour_System SHALL immediately show related UI elements and enable related functionality
4. WHEN the application loads THEN the City_Tour_System SHALL fetch Feature_Toggle states from the settings table and apply them to the UI
5. WHEN Feature_Toggle states change THEN the City_Tour_System SHALL apply changes without requiring application restart

### Requirement 13: Connection State Handling

**User Story:** As a Participant, I want the app to handle poor network conditions gracefully, so that I can continue using the app during outdoor exploration.

#### Acceptance Criteria

1. WHEN network connection is lost THEN the City_Tour_System SHALL display a visible offline indicator without blocking map interaction
2. WHILE offline THEN the City_Tour_System SHALL retain cached map tiles and Quest_Spot data for continued viewing
3. WHEN network connection is restored THEN the City_Tour_System SHALL automatically reconnect Supabase Realtime subscriptions and sync pending state
4. WHEN a check-in attempt fails due to network error THEN the City_Tour_System SHALL display a retry option with clear error messaging
5. WHILE offline THEN the City_Tour_System SHALL disable check-in attempts and inform the Participant that network is required for verification

### Requirement 14: Simple Authentication

**User Story:** As a Participant, I want to login with a simple method, so that I can quickly join the tour without complex registration.

#### Acceptance Criteria

1. WHEN a Participant accesses the app THEN the City_Tour_System SHALL display a login form requiring name and optional profile photo
2. WHEN a Participant submits login THEN the City_Tour_System SHALL create a session and store participant data in the database
3. WHEN a Participant is already logged in THEN the City_Tour_System SHALL redirect to the map page automatically
4. WHEN a Participant logs out THEN the City_Tour_System SHALL clear the session and redirect to the login page
5. WHEN an Admin needs to identify participants THEN the City_Tour_System SHALL generate a unique participant code for each registration
