# Sport Session Strava Catalog Design

## Goal
Make the Sport Session dropdown closer to Strava while keeping it concise and calories-friendly. Users should see popular sports that commonly produce calories, including HIIT and gym workouts. The `Other` option should ask for a specific sport name.

## Current State
- The Add Activity modal loads sport options from `activity_types` where `mode = 'sport'`.
- Sport session points are already calories-based: `1 calorie = 1 point`.
- Strava sync stores Strava `type` and `sport_type` on synced activities, but manual Sport Session choices are currently a short seeded catalog.

## Design
- Keep the existing `/api/activity-types` contract and `activity_types` table as the source of truth.
- Add a migration that seeds a popular calories-friendly sport catalog.
- Use stable `code` values such as `sport.hiit`, `sport.weight_training`, and `sport.virtual_ride`.
- Keep all seeded sport rows active, calories-required, and points `0`; points continue to come from entered calories.
- Mark `sport.other` as `is_custom_input = true`.
- In the Sport Session form, show a required text field when the selected sport row has `is_custom_input = true`.
- Submit that text as `custom_name`; store the visible activity name as the custom name while keeping `type = 'Other'` for catalog tracking.

## Initial Catalog
- Running
- Trail Run
- Walking
- Hiking
- Ride / Cycling
- Mountain Bike
- Swimming
- Workout
- HIIT
- Weight Training
- Crossfit
- Yoga
- Pilates
- Soccer / Futsal
- Badminton
- Tennis
- Basketball
- Volleyball
- Rowing
- Elliptical
- Stair Stepper
- Virtual Ride
- Virtual Run
- Other

## Behavior
- Non-Other sport selection: user chooses sport, enters calories, uploads proof, and saves.
- Other sport selection: user chooses Other, enters sport name, enters calories, uploads proof, and saves.
- `Other` without sport name returns validation error.
- Admin can still rename, hide, or reorder rows through the existing Activity Types admin surface.

## Verification
- Add or update route/component tests for sport `Other` validation if current test surface supports it.
- Run focused tests for activity creation logic.
- Run `npm run build` after implementation.
