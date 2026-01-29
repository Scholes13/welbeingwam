# Design Document: City Tour Map

## Overview

City Tour Map adalah aplikasi interactive city tour dengan gamifikasi yang dibangun di atas Next.js 16 dengan Supabase sebagai backend. Aplikasi ini menggunakan Mapbox GL JS untuk visualisasi peta dan PostGIS untuk validasi geospatial server-side. Sistem dirancang untuk event 5 jam dengan 50 peserta, dengan fitur real-time leaderboard, streak-based badges, dan feature toggles untuk fleksibilitas.

### Key Design Decisions
1. **PostGIS GEOGRAPHY(POINT, 4326)** - Akurasi jarak dalam meter untuk validasi check-in
2. **Server-side validation** - Semua validasi lokasi dilakukan di database untuk mencegah manipulasi
3. **Database triggers** - Badge evaluation dilakukan di PostgreSQL untuk performa optimal
4. **Feature toggles via settings table** - Fleksibilitas tanpa code changes
5. **Supabase Realtime** - Live updates untuk leaderboard dan analytics

## Architecture

```mermaid
graph TB
    subgraph "Client (Next.js)"
        UI[React Components]
        MapBox[Mapbox GL JS]
        Context[Settings Context]
        SWR[SWR Cache]
    end
    
    subgraph "API Routes"
        AuthAPI[/api/auth/*]
        SpotsAPI[/api/spots/*]
        CheckinAPI[/api/checkin/*]
        AdminAPI[/api/admin/*]
        SettingsAPI[/api/settings/*]
    end
    
    subgraph "Supabase"
        DB[(PostgreSQL + PostGIS)]
        Storage[Supabase Storage]
        Realtime[Realtime Subscriptions]
        Triggers[Database Triggers]
    end
    
    UI --> MapBox
    UI --> Context
    UI --> SWR
    SWR --> AuthAPI
    SWR --> SpotsAPI
    SWR --> CheckinAPI
    MapBox --> SpotsAPI
    
    AuthAPI --> DB
    SpotsAPI --> DB
    CheckinAPI --> DB
    CheckinAPI --> Storage
    AdminAPI --> DB
    SettingsAPI --> DB
    
    DB --> Triggers
    Triggers --> DB
    DB --> Realtime
    Realtime --> UI
```


## Components and Interfaces

### Page Structure

```
src/app/
├── page.tsx                    # Login page
├── map/
│   └── page.tsx               # Main map view (participant)
├── leaderboard/
│   └── page.tsx               # Leaderboard page
├── profile/
│   └── page.tsx               # Participant profile & progress
├── dashboard/
│   └── admin/
│       ├── page.tsx           # Admin dashboard
│       ├── spots/
│       │   └── page.tsx       # Quest spot management
│       ├── settings/
│       │   └── page.tsx       # Feature toggles & point config
│       └── session/
│           └── page.tsx       # Tour session management
└── api/
    ├── auth/
    │   ├── login/route.ts
    │   └── logout/route.ts
    ├── spots/
    │   ├── route.ts           # GET all spots as GeoJSON
    │   └── [id]/route.ts      # GET/PUT/DELETE spot
    ├── checkin/
    │   └── route.ts           # POST check-in with GPS validation
    ├── leaderboard/
    │   └── route.ts           # GET ranked participants
    ├── admin/
    │   ├── spots/route.ts     # Admin CRUD for spots
    │   ├── categories/route.ts
    │   ├── participants/route.ts
    │   └── analytics/route.ts
    └── settings/
        └── route.ts           # GET/PUT settings
```

### Core Components

```typescript
// src/components/map/
TourMap.tsx              // Mapbox wrapper with spots layer
SpotMarker.tsx           // Custom marker with category icon
SpotPopup.tsx            // Popup with spot details & check-in
UserLocationMarker.tsx   // Pulsing current location
CategoryFilter.tsx       // Filter buttons by category

// src/components/checkin/
CheckInButton.tsx        // GPS-validated check-in
PhotoUpload.tsx          // Optional photo capture
CheckInSuccess.tsx       // Success animation with points

// src/components/badges/
BadgeCard.tsx            // Single badge display
BadgeGallery.tsx         // All earned badges
BadgeUnlockAnimation.tsx // Celebration on badge earn

// src/components/leaderboard/
LeaderboardList.tsx      // Ranked participant list
LeaderboardEntry.tsx     // Single entry with stats
CurrentUserHighlight.tsx // Highlighted current user

// src/components/admin/
SpotEditor.tsx           // Create/edit spot form
MapPicker.tsx            // Click-to-select coordinates
RadiusPreview.tsx        // Visual radius circle
SettingsPanel.tsx        // Feature toggles UI
AnalyticsDashboard.tsx   // Real-time stats

// src/components/ui/
ConnectionStatus.tsx     // Online/offline indicator
SessionTimer.tsx         // Countdown timer
Loader.tsx               // Loading states
Toast.tsx                // Notifications
```


### Context Providers

```typescript
// src/context/SettingsContext.tsx
interface Settings {
  base_checkin_points: number;
  photo_bonus_points: number;
  category_streak_bonus: number;
  speed_demon_bonus: number;
  features: {
    photo_checkin: boolean;
    badges: boolean;
    leaderboard: boolean;
    category_filter: boolean;
  };
}

// src/context/SessionContext.tsx
interface TourSession {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'ended';
  remaining_seconds: number;
}

// src/context/ConnectionContext.tsx
interface ConnectionState {
  isOnline: boolean;
  lastSync: Date | null;
}
```

### API Interfaces

```typescript
// Check-in Request/Response
interface CheckInRequest {
  spot_id: string;
  latitude: number;
  longitude: number;
  photo?: File;
}

interface CheckInResponse {
  success: boolean;
  visit_id?: string;
  points_earned?: number;
  badges_earned?: Badge[];
  error?: {
    code: 'OUT_OF_RANGE' | 'ALREADY_VISITED' | 'SESSION_INACTIVE';
    distance_meters?: number;
    message: string;
  };
}

// Spots GeoJSON
interface SpotsGeoJSON {
  type: 'FeatureCollection';
  features: SpotFeature[];
}

interface SpotFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    name: string;
    description: string;
    category_id: string;
    category_name: string;
    category_icon: string;
    points: number;
    radius: number;
    visited: boolean;
    visited_at?: string;
  };
}
```

## Data Models

### Database Schema (Supabase + PostGIS)

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  profile_photo_url TEXT,
  total_points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon_url TEXT,
  color VARCHAR(7) DEFAULT '#FC4C02',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest spots table with PostGIS
CREATE TABLE quest_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius INTEGER NOT NULL CHECK (radius >= 20 AND radius <= 500),
  points INTEGER NOT NULL DEFAULT 50,
  category_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) NOT NULL,
  spot_id UUID REFERENCES quest_spots(id) NOT NULL,
  photo_url TEXT,
  points_earned INTEGER NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, spot_id)
);

-- Badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type VARCHAR(20) NOT NULL, -- 'category_streak', 'speed_demon', 'completion'
  category_id UUID REFERENCES categories(id), -- for category-specific badges
  bonus_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant badges (earned)
CREATE TABLE participant_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, badge_id)
);

-- Tour sessions table
CREATE TABLE tour_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (feature toggles & config)
CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('base_checkin_points', '50'),
  ('photo_bonus_points', '50'),
  ('category_streak_bonus', '200'),
  ('speed_demon_bonus', '300'),
  ('feature_photo_checkin', 'true'),
  ('feature_badges', 'true'),
  ('feature_leaderboard', 'true'),
  ('feature_category_filter', 'true');

-- Indexes for performance
CREATE INDEX idx_visits_participant ON visits(participant_id);
CREATE INDEX idx_visits_spot ON visits(spot_id);
CREATE INDEX idx_visits_checked_in_at ON visits(checked_in_at);
CREATE INDEX idx_quest_spots_location ON quest_spots USING GIST(location);
CREATE INDEX idx_quest_spots_category ON quest_spots(category_id);
CREATE INDEX idx_participants_points ON participants(total_points DESC);
```


### PostGIS Functions

```sql
-- Function to check if participant is within spot radius
CREATE OR REPLACE FUNCTION check_in_spot(
  p_participant_id UUID,
  p_spot_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_photo_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_spot RECORD;
  v_distance DOUBLE PRECISION;
  v_session RECORD;
  v_existing_visit RECORD;
  v_base_points INTEGER;
  v_photo_bonus INTEGER;
  v_total_points INTEGER;
  v_visit_id UUID;
BEGIN
  -- Check active session
  SELECT * INTO v_session FROM tour_sessions 
  WHERE is_active = TRUE 
    AND NOW() BETWEEN start_time AND end_time
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'SESSION_INACTIVE',
        'message', 'Tour session is not active'
      )
    );
  END IF;

  -- Check for existing visit
  SELECT * INTO v_existing_visit FROM visits 
  WHERE participant_id = p_participant_id AND spot_id = p_spot_id;
  
  IF v_existing_visit IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'ALREADY_VISITED',
        'message', 'Already checked in at this spot',
        'visited_at', v_existing_visit.checked_in_at
      )
    );
  END IF;

  -- Get spot and calculate distance
  SELECT *, ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  ) as distance INTO v_spot
  FROM quest_spots 
  WHERE id = p_spot_id AND is_active = TRUE AND deleted_at IS NULL;
  
  IF v_spot IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'SPOT_NOT_FOUND',
        'message', 'Quest spot not found'
      )
    );
  END IF;

  v_distance := v_spot.distance;
  
  -- Check if within radius
  IF v_distance > v_spot.radius THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'OUT_OF_RANGE',
        'distance_meters', ROUND(v_distance),
        'required_radius', v_spot.radius,
        'message', 'You are ' || ROUND(v_distance) || 'm away. Get within ' || v_spot.radius || 'm to check in.'
      )
    );
  END IF;

  -- Get point settings
  SELECT (value::TEXT)::INTEGER INTO v_base_points FROM settings WHERE key = 'base_checkin_points';
  SELECT (value::TEXT)::INTEGER INTO v_photo_bonus FROM settings WHERE key = 'photo_bonus_points';
  
  v_base_points := COALESCE(v_base_points, 50);
  v_photo_bonus := COALESCE(v_photo_bonus, 50);
  
  -- Calculate total points
  v_total_points := v_base_points;
  IF p_photo_url IS NOT NULL THEN
    v_total_points := v_total_points + v_photo_bonus;
  END IF;

  -- Create visit record
  INSERT INTO visits (participant_id, spot_id, photo_url, points_earned)
  VALUES (p_participant_id, p_spot_id, p_photo_url, v_total_points)
  RETURNING id INTO v_visit_id;

  -- Update participant total points
  UPDATE participants 
  SET total_points = total_points + v_total_points,
      updated_at = NOW()
  WHERE id = p_participant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'visit_id', v_visit_id,
    'points_earned', v_total_points,
    'distance_meters', ROUND(v_distance)
  );
END;
$$ LANGUAGE plpgsql;
```


### Badge Evaluation Trigger

```sql
-- Function to evaluate and award badges after check-in
CREATE OR REPLACE FUNCTION evaluate_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_id UUID;
  v_session_start TIMESTAMPTZ;
  v_category_id UUID;
  v_streak_count INTEGER;
  v_first_hour_count INTEGER;
  v_total_spots INTEGER;
  v_visited_spots INTEGER;
  v_badge RECORD;
  v_badges_enabled BOOLEAN;
  v_streak_bonus INTEGER;
  v_speed_bonus INTEGER;
BEGIN
  -- Check if badges feature is enabled
  SELECT (value::TEXT)::BOOLEAN INTO v_badges_enabled 
  FROM settings WHERE key = 'feature_badges';
  
  IF NOT COALESCE(v_badges_enabled, TRUE) THEN
    RETURN NEW;
  END IF;

  v_participant_id := NEW.participant_id;
  
  -- Get bonus point values
  SELECT (value::TEXT)::INTEGER INTO v_streak_bonus FROM settings WHERE key = 'category_streak_bonus';
  SELECT (value::TEXT)::INTEGER INTO v_speed_bonus FROM settings WHERE key = 'speed_demon_bonus';
  v_streak_bonus := COALESCE(v_streak_bonus, 200);
  v_speed_bonus := COALESCE(v_speed_bonus, 300);

  -- Check Category Streak (5 consecutive same category)
  WITH recent_visits AS (
    SELECT v.id, qs.category_id,
           ROW_NUMBER() OVER (ORDER BY v.checked_in_at DESC) as rn
    FROM visits v
    JOIN quest_spots qs ON v.spot_id = qs.id
    WHERE v.participant_id = v_participant_id
    ORDER BY v.checked_in_at DESC
    LIMIT 5
  )
  SELECT category_id, COUNT(*) INTO v_category_id, v_streak_count
  FROM recent_visits
  GROUP BY category_id
  HAVING COUNT(*) = 5;

  IF v_streak_count = 5 AND v_category_id IS NOT NULL THEN
    -- Find category-specific badge
    SELECT * INTO v_badge FROM badges 
    WHERE badge_type = 'category_streak' AND category_id = v_category_id;
    
    IF v_badge IS NOT NULL THEN
      -- Award badge if not already earned
      INSERT INTO participant_badges (participant_id, badge_id)
      VALUES (v_participant_id, v_badge.id)
      ON CONFLICT (participant_id, badge_id) DO NOTHING;
      
      -- Award bonus points if badge was newly inserted
      IF FOUND THEN
        UPDATE participants 
        SET total_points = total_points + v_streak_bonus
        WHERE id = v_participant_id;
      END IF;
    END IF;
  END IF;

  -- Check Speed Demon (10 spots in first hour)
  SELECT start_time INTO v_session_start FROM tour_sessions 
  WHERE is_active = TRUE LIMIT 1;
  
  IF v_session_start IS NOT NULL THEN
    SELECT COUNT(*) INTO v_first_hour_count
    FROM visits
    WHERE participant_id = v_participant_id
      AND checked_in_at <= v_session_start + INTERVAL '1 hour';
    
    IF v_first_hour_count >= 10 THEN
      SELECT * INTO v_badge FROM badges WHERE badge_type = 'speed_demon';
      
      IF v_badge IS NOT NULL THEN
        INSERT INTO participant_badges (participant_id, badge_id)
        VALUES (v_participant_id, v_badge.id)
        ON CONFLICT (participant_id, badge_id) DO NOTHING;
        
        IF FOUND THEN
          UPDATE participants 
          SET total_points = total_points + v_speed_bonus
          WHERE id = v_participant_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check Completion Badge (all spots visited)
  SELECT COUNT(*) INTO v_total_spots FROM quest_spots 
  WHERE is_active = TRUE AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_visited_spots FROM visits 
  WHERE participant_id = v_participant_id;
  
  IF v_visited_spots = v_total_spots AND v_total_spots > 0 THEN
    SELECT * INTO v_badge FROM badges WHERE badge_type = 'completion';
    
    IF v_badge IS NOT NULL THEN
      INSERT INTO participant_badges (participant_id, badge_id)
      VALUES (v_participant_id, v_badge.id)
      ON CONFLICT (participant_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_evaluate_badges
AFTER INSERT ON visits
FOR EACH ROW
EXECUTE FUNCTION evaluate_badges();
```


### Leaderboard View

```sql
-- Materialized view for leaderboard (refreshed on demand)
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  p.id,
  p.code,
  p.name,
  p.profile_photo_url,
  p.total_points,
  COUNT(DISTINCT v.spot_id) as spots_visited,
  COUNT(DISTINCT pb.badge_id) as badge_count,
  MAX(v.checked_in_at) as last_checkin,
  RANK() OVER (
    ORDER BY p.total_points DESC, 
    MAX(v.checked_in_at) ASC NULLS LAST
  ) as rank
FROM participants p
LEFT JOIN visits v ON p.id = v.participant_id
LEFT JOIN participant_badges pb ON p.id = pb.participant_id
WHERE p.is_admin = FALSE
GROUP BY p.id, p.code, p.name, p.profile_photo_url, p.total_points
ORDER BY rank;

-- Enable Realtime for visits table
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE participant_badges;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: GPS Distance Validation Accuracy
*For any* participant location and quest spot location, the PostGIS st_dwithin function SHALL correctly determine if the participant is within the configured radius, and st_distance SHALL return the accurate distance in meters.
**Validates: Requirements 2.1, 2.3**

### Property 2: Check-in Points Calculation
*For any* successful check-in, the points awarded SHALL equal base_checkin_points when no photo is uploaded, and SHALL equal base_checkin_points + photo_bonus_points when a photo is uploaded.
**Validates: Requirements 3.2, 3.3, 5.4**

### Property 3: Duplicate Check-in Prevention
*For any* participant-spot pair that already has a visit record, subsequent check-in attempts SHALL be rejected and return the original visit timestamp.
**Validates: Requirements 2.5**

### Property 4: Radius Validation Bounds
*For any* quest spot radius configuration, the system SHALL reject values below 20 meters or above 500 meters.
**Validates: Requirements 2.7**

### Property 5: Category Streak Badge Award
*For any* participant with exactly 5 consecutive visits to spots of the same category, the system SHALL award the corresponding category badge and bonus points exactly once.
**Validates: Requirements 6.1, 6.5**

### Property 6: Speed Demon Badge Award
*For any* participant with 10 or more visits within the first hour of the tour session, the system SHALL award the Speed Demon badge and bonus points exactly once.
**Validates: Requirements 6.2, 6.5**

### Property 7: Leaderboard Ranking Consistency
*For any* set of participants, the leaderboard SHALL rank by total_points descending, with earlier last_checkin timestamp as tiebreaker for equal points.
**Validates: Requirements 10.1, 10.5**

### Property 8: Session Time Enforcement
*For any* check-in attempt outside the active tour session time window (before start or after end), the system SHALL reject the check-in with appropriate error code.
**Validates: Requirements 11.2, 11.3**

### Property 9: Feature Toggle UI Consistency
*For any* feature toggle state, the corresponding UI elements SHALL be visible when enabled and hidden when disabled.
**Validates: Requirements 12.2, 12.3, 12.4**

### Property 10: Participant Code Uniqueness
*For any* participant registration, the generated participant code SHALL be unique across all existing participants.
**Validates: Requirements 14.5**

### Property 11: Visit History Preservation on Spot Edit
*For any* quest spot edit operation, the count of visits to that spot before and after the edit SHALL be equal.
**Validates: Requirements 4.4**

### Property 12: Soft Delete Preservation
*For any* quest spot delete operation, the record SHALL remain in the database with deleted_at timestamp set, preserving all visit history.
**Validates: Requirements 4.5**

### Property 13: GeoJSON Visited Status Accuracy
*For any* participant viewing the map, the visited property in GeoJSON features SHALL be true if and only if a visit record exists for that participant-spot pair.
**Validates: Requirements 1.5**

### Property 14: Progress Statistics Accuracy
*For any* participant, the displayed total_points SHALL equal the sum of points_earned from all their visits plus badge bonus points, and spots_visited SHALL equal the count of their visit records.
**Validates: Requirements 7.1**


## Error Handling

### Error Codes and Messages

| Code | HTTP Status | Message | Context |
|------|-------------|---------|---------|
| `OUT_OF_RANGE` | 400 | "You are {distance}m away. Get within {radius}m to check in." | Check-in outside radius |
| `ALREADY_VISITED` | 409 | "Already checked in at this spot" | Duplicate check-in |
| `SESSION_INACTIVE` | 403 | "Tour session is not active" | Check-in outside session |
| `SPOT_NOT_FOUND` | 404 | "Quest spot not found" | Invalid spot_id |
| `LOCATION_REQUIRED` | 400 | "GPS location is required for check-in" | Missing coordinates |
| `INVALID_RADIUS` | 400 | "Radius must be between 20 and 500 meters" | Admin spot config |
| `UNAUTHORIZED` | 401 | "Please login to continue" | No valid session |
| `ADMIN_REQUIRED` | 403 | "Admin access required" | Non-admin accessing admin routes |
| `NETWORK_ERROR` | 0 | "Connection lost. Please check your internet." | Client-side network failure |

### Client-Side Error Handling

```typescript
// src/lib/api-client.ts
export async function apiRequest<T>(
  url: string, 
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || 'UNKNOWN_ERROR',
          message: data.error?.message || 'An error occurred',
          details: data.error
        }
      };
    }
    
    return { success: true, data };
  } catch (error) {
    // Network error
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Connection lost. Please check your internet.'
      }
    };
  }
}
```

### Connection State Management

```typescript
// src/hooks/useConnectionStatus.ts
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
}
```

## Testing Strategy

### Dual Testing Approach

This project uses both unit tests and property-based tests for comprehensive coverage:

1. **Unit Tests** - Verify specific examples, edge cases, and integration points
2. **Property-Based Tests** - Verify universal properties that should hold across all inputs

### Testing Framework

- **Unit Testing**: Vitest (compatible with Next.js)
- **Property-Based Testing**: fast-check library
- **Database Testing**: Supabase local development with test database

### Property-Based Test Configuration

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with the corresponding correctness property from the design document
- Use format: `**Feature: city-tour-map, Property {number}: {property_text}**`

### Test Categories

#### 1. Database Function Tests
- `check_in_spot` function with various coordinates
- `evaluate_badges` trigger with streak scenarios
- Leaderboard ranking with tiebreaker scenarios

#### 2. API Endpoint Tests
- Check-in validation responses
- Settings CRUD operations
- Admin authorization checks

#### 3. Component Tests
- Feature toggle conditional rendering
- GeoJSON transformation with visited status
- Points calculation display

#### 4. Integration Tests
- Full check-in flow with photo upload
- Badge award notification flow
- Real-time leaderboard updates

### Test File Structure

```
src/
├── __tests__/
│   ├── lib/
│   │   ├── checkin.test.ts
│   │   ├── checkin.property.test.ts
│   │   ├── leaderboard.test.ts
│   │   ├── leaderboard.property.test.ts
│   │   └── settings.test.ts
│   ├── api/
│   │   ├── checkin.api.test.ts
│   │   └── spots.api.test.ts
│   └── components/
│       ├── TourMap.test.tsx
│       └── FeatureToggle.test.tsx
└── ...
```
