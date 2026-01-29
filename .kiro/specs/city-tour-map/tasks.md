# Implementation Plan

- [x] 1. Setup Database Schema and PostGIS





  - [x] 1.1 Create Supabase migration for PostGIS extension and core tables


    - Enable PostGIS extension
    - Create participants, categories, quest_spots, visits, badges, participant_badges, tour_sessions, settings tables
    - Add indexes for performance
    - _Requirements: 2.1, 4.1, 6.5, 11.1, 12.1_
  - [x] 1.2 Create check_in_spot PostgreSQL function


    - Implement server-side GPS validation using st_dwithin
    - Handle session validation, duplicate check prevention, points calculation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3_
  - [ ]* 1.3 Write property test for check_in_spot function
    - **Property 1: GPS Distance Validation Accuracy**
    - **Property 2: Check-in Points Calculation**
    - **Property 3: Duplicate Check-in Prevention**
    - **Validates: Requirements 2.1, 2.3, 2.5, 3.2, 3.3, 5.4**
  - [x] 1.4 Create evaluate_badges trigger function


    - Implement category streak detection (5 consecutive same category)
    - Implement speed demon detection (10 spots in first hour)
    - Implement completion badge detection
    - _Requirements: 6.1, 6.2, 6.5_
  - [ ]* 1.5 Write property test for badge evaluation
    - **Property 5: Category Streak Badge Award**
    - **Property 6: Speed Demon Badge Award**
    - **Validates: Requirements 6.1, 6.2, 6.5**
  - [x] 1.6 Create leaderboard_view with ranking logic


    - Implement ranking by points with timestamp tiebreaker
    - Enable Supabase Realtime for visits and participant_badges tables
    - _Requirements: 10.1, 10.5_
  - [ ]* 1.7 Write property test for leaderboard ranking
    - **Property 7: Leaderboard Ranking Consistency**
    - **Validates: Requirements 10.1, 10.5**
  - [x] 1.8 Seed default data


    - Insert default categories (Historical, Culinary, Art, Nature, Shopping, Photo Spot)
    - Insert default badges for each category and special badges
    - Insert default settings values
    - _Requirements: 9.1, 5.1, 12.1_

- [x] 2. Checkpoint - Ensure all database tests pass






  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Setup Core Application Infrastructure




  - [x] 3.1 Install and configure Mapbox GL JS


    - Add mapbox-gl package
    - Create Mapbox wrapper component with TypeScript types
    - Configure environment variables for Mapbox token
    - _Requirements: 1.1_
  - [x] 3.2 Create Settings Context for feature toggles


    - Implement SettingsContext with feature toggle state
    - Create useSettings hook for consuming settings
    - Fetch settings on app load
    - _Requirements: 12.4_
  - [ ]* 3.3 Write property test for feature toggle UI consistency
    - **Property 9: Feature Toggle UI Consistency**
    - **Validates: Requirements 12.2, 12.3, 12.4**
  - [x] 3.4 Create Session Context for tour timing


    - Implement SessionContext with countdown timer
    - Create useSession hook for session status
    - _Requirements: 11.2, 11.3, 11.4_
  - [ ]* 3.5 Write property test for session time enforcement
    - **Property 8: Session Time Enforcement**
    - **Validates: Requirements 11.2, 11.3**
  - [x] 3.6 Create Connection Status hook and component


    - Implement useConnectionStatus hook
    - Create ConnectionStatus indicator component
    - _Requirements: 13.1, 13.3_
  - [x] 3.7 Update Supabase client configuration


    - Configure Supabase client with Realtime enabled
    - Create typed database client
    - _Requirements: 10.3, 8.4_

- [x] 4. Implement Authentication System
  - [x] 4.1 Create simple login API route
    - Implement POST /api/tour/auth/register with name, gender, optional photo
    - Generate unique participant code using nanoid
    - Create session cookie (participant_id)
    - Gender-specific avatar generation using Dicebear
    - _Requirements: 14.1, 14.2, 14.5_
  - [ ]* 4.2 Write property test for participant code uniqueness
    - **Property 10: Participant Code Uniqueness**
    - **Validates: Requirements 14.5**
  - [x] 4.3 Create logout API route
    - Implement POST /api/tour/auth/logout
    - Clear session cookie
    - _Requirements: 14.4_
  - [x] 4.4 Update login page UI
    - Created TourLoginForm component with name and gender selection
    - Gender-specific avatar styles (male/female tops)
    - Redirect to /map on successful registration
    - _Requirements: 14.1, 14.2, 14.3_
  - [x] 4.5 Create auth middleware for protected routes
    - Created tour-auth.ts with getCurrentParticipant, verifyAdmin, getParticipantId
    - Created /api/tour/auth/me for session validation
    - _Requirements: 14.3_

- [x] 5. Checkpoint - Ensure auth flow works





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Quest Spots API and Map Display




  - [x] 6.1 Create spots API route returning GeoJSON


    - Implement GET /api/spots with participant's visited status
    - Transform PostGIS geography to GeoJSON format
    - Include category info and points
    - _Requirements: 1.1, 1.2, 1.5_
  - [ ]* 6.2 Write property test for GeoJSON visited status
    - **Property 13: GeoJSON Visited Status Accuracy**
    - **Validates: Requirements 1.5**
  - [x] 6.3 Create TourMap component with Mapbox


    - Implement map initialization with fitBounds
    - Add GeoJSON source and symbol layer for spots
    - Implement category-specific marker icons
    - _Requirements: 1.1, 1.4, 9.3_
  - [x] 6.4 Create SpotPopup component


    - Display spot name, description, points, category
    - Show visited status and timestamp if visited
    - _Requirements: 1.2_
  - [x] 6.5 Create UserLocationMarker with pulsing animation


    - Implement geolocation tracking
    - Add pulsing CSS animation for current location
    - _Requirements: 1.3_
  - [x] 6.6 Create CategoryFilter component


    - Implement filter buttons for each category
    - Use Mapbox layer filtering for show/hide
    - Respect feature_category_filter toggle
    - _Requirements: 9.2, 12.2_
  - [x] 6.7 Create map page with all components


    - Integrate TourMap, CategoryFilter, SessionTimer
    - Add ConnectionStatus indicator
    - _Requirements: 1.1, 1.6, 11.4, 13.1_

- [x] 7. Implement Check-in System




  - [x] 7.1 Create check-in API route


    - Implement POST /api/checkin calling check_in_spot function
    - Handle photo upload to Supabase Storage
    - Return points earned and any badges
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4_
  - [x] 7.2 Create CheckInButton component


    - Show distance to selected spot
    - Enable/disable based on proximity (client-side preview)
    - Handle loading and error states
    - _Requirements: 2.2, 2.3, 2.6_
  - [x] 7.3 Create PhotoUpload component


    - Implement camera capture or file select
    - Compress image before upload
    - Respect photo_checkin feature toggle
    - _Requirements: 3.1, 3.4, 3.5_
  - [x] 7.4 Create CheckInSuccess component


    - Display points earned animation
    - Show badge unlock if earned
    - Trigger confetti celebration
    - _Requirements: 6.3, 7.3_
  - [x] 7.5 Integrate check-in flow in SpotPopup


    - Add CheckInButton and PhotoUpload to popup
    - Handle success/error responses
    - Update map markers on successful check-in
    - _Requirements: 2.2, 3.1_

- [x] 8. Checkpoint - Ensure check-in flow works





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Leaderboard with Real-time Updates




  - [x] 9.1 Create leaderboard API route


    - Implement GET /api/leaderboard using leaderboard_view
    - Include current participant's rank
    - _Requirements: 10.1, 10.2_
  - [x] 9.2 Create LeaderboardList component


    - Display ranked participants with stats
    - Highlight current user's position
    - Auto-scroll to current user
    - _Requirements: 10.2, 10.4_
  - [x] 9.3 Implement Supabase Realtime subscription


    - Subscribe to visits table changes
    - Refresh leaderboard on new check-ins
    - _Requirements: 10.3_
  - [x] 9.4 Create leaderboard page


    - Integrate LeaderboardList with real-time updates
    - Respect leaderboard feature toggle
    - _Requirements: 10.1, 12.2_

- [x] 10. Implement Profile and Progress Tracking





  - [x] 10.1 Create profile API route

    - Implement GET /api/profile with stats and badges
    - Calculate total points, spots visited, remaining
    - _Requirements: 7.1_
  - [ ]* 10.2 Write property test for progress statistics
    - **Property 14: Progress Statistics Accuracy**
    - **Validates: Requirements 7.1**
  - [x] 10.3 Create profile page with progress display


    - Show total points, spots visited/remaining
    - Display earned badges gallery
    - List visited spots with timestamps
    - _Requirements: 7.1, 7.2, 6.4_
  - [x] 10.4 Create BadgeGallery component


    - Display earned badges with timestamps
    - Respect badges feature toggle
    - _Requirements: 6.4, 12.2_

- [x] 11. Implement Admin Dashboard




  - [x] 11.1 Create admin spots management API


    - Implement CRUD for quest_spots
    - Validate radius bounds (20-500m)
    - Handle soft delete
    - _Requirements: 4.1, 4.4, 4.5, 2.7_
  - [ ]* 11.2 Write property test for radius validation and soft delete
    - **Property 4: Radius Validation Bounds**
    - **Property 11: Visit History Preservation on Spot Edit**
    - **Property 12: Soft Delete Preservation**
    - **Validates: Requirements 2.7, 4.4, 4.5**
  - [x] 11.3 Create SpotEditor component with MapPicker


    - Implement map click to select coordinates
    - Show radius preview circle
    - Category selection dropdown
    - _Requirements: 4.2, 4.3, 4.1_
  - [x] 11.4 Create admin spots list page


    - Display all spots with visit counts
    - Edit/delete actions
    - _Requirements: 4.6_
  - [x] 11.5 Create admin analytics dashboard


    - Display total participants, check-ins, top spots
    - Real-time updates via Supabase Realtime
    - _Requirements: 8.1, 8.4_
  - [x] 11.6 Create participant detail view


    - Show visited spots timeline
    - Display points and badges
    - _Requirements: 8.2, 8.3_

- [x] 12. Implement Admin Settings and Session Management




  - [x] 12.1 Create settings API route

    - Implement GET/PUT /api/settings
    - Handle point values and feature toggles
    - _Requirements: 5.1, 5.2, 12.1_
  - [x] 12.2 Create SettingsPanel component


    - Point multiplier inputs (base, photo bonus, badge bonuses)
    - Feature toggle switches
    - _Requirements: 5.1, 12.1_
  - [x] 12.3 Create session management API


    - Implement CRUD for tour_sessions
    - Validate start/end times
    - _Requirements: 11.1_
  - [x] 12.4 Create session management page


    - Session create/edit form
    - Display session status and countdown
    - _Requirements: 11.1, 11.5_
  - [x] 12.5 Create admin categories management


    - CRUD for categories with icon upload
    - _Requirements: 9.4_

- [x] 13. Implement Navigation and Layout Updates




  - [x] 13.1 Update BottomNav for new routes


    - Map, Leaderboard, Profile tabs
    - Admin button for admin users
    - _Requirements: 1.1, 10.1, 7.1_
  - [x] 13.2 Add SessionTimer to navigation header


    - Display countdown when session active
    - Show "Not Started" or "Ended" status
    - _Requirements: 11.4_
  - [x] 13.3 Update app metadata and branding


    - Change title from WAM25 to City Tour
    - Update manifest.json
    - _Requirements: N/A (branding)_

- [x] 14. Final Integration and Polish




  - [x] 14.1 Implement offline handling for map


    - Cache map tiles
    - Show offline indicator
    - Disable check-in when offline
    - _Requirements: 13.1, 13.2, 13.5_
  - [x] 14.2 Add error retry mechanism


    - Retry button for failed check-ins
    - Auto-reconnect Realtime on connection restore
    - _Requirements: 13.3, 13.4_
  - [x] 14.3 Add completion celebration


    - Detect when all spots visited
    - Show completion badge and animation
    - _Requirements: 7.3_
  - [x] 14.4 Clean up unused Strava/wellness code


    - Remove Strava auth components
    - Remove wellness-specific features
    - _Requirements: N/A (cleanup)_

- [x] 15. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
