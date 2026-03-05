# WLM Rebranding & Gamification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand WAM25 → Werkudara Life Mode (WLM) and add 6-dimension wellness gamification with quest templates, photo verification, streak events, and monthly awards.

**Architecture:** Extend existing quest system with dimension categorization. New tables for dimensions, quest_templates, streak_events, user_streaks, monthly_awards. All migrations are additive (no destructive changes). Mono-brand orange color system.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, Framer Motion, Vitest, Lucide React icons

**Design Doc:** `docs/plans/2026-03-05-wlm-rebranding-gamification-design.md`

---

## Phase 1: Rebranding + Dimension Foundation

### Task 1: Rebrand — Update Package & Metadata

**Files:**
- Modify: `package.json:2-3`
- Modify: `src/app/layout.tsx:25-34`

**Step 1: Update package.json**

Change name and version:
```json
"name": "werkudara-life-mode",
"version": "2.0.0",
```

**Step 2: Update layout.tsx metadata**

Replace the metadata export (lines 25-34):
```typescript
export const metadata: Metadata = {
  title: 'Werkudara Life Mode',
  description: 'Balance Within. Impact Beyond.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WLM',
  },
}
```

**Step 3: Commit**

```bash
git add package.json src/app/layout.tsx
git commit -m "rebrand: update package name and metadata to WLM"
```

---

### Task 2: Rebrand — Update Login & Profile Branding

**Files:**
- Modify: `src/components/LoginForm.tsx:53,56`
- Modify: `src/app/profile/page.tsx:340`

**Step 1: Update LoginForm.tsx**

Find the h1 "WAM25" (line 53) and replace with:
```tsx
<h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-[#FC4C02] to-orange-400 bg-clip-text text-transparent">
  WLM
</h1>
```

Find the tagline "Scaling Impact" (line 56) and replace with:
```tsx
<p className="text-gray-400 text-sm tracking-widest uppercase">Balance Within. Impact Beyond.</p>
```

**Step 2: Update profile footer**

Find "ScalingImpact v1.0 Beta" (line 340) and replace with:
```tsx
WLM v2.0 — Scaling Impact 2026
```

**Step 3: Search for any remaining WAM25 references**

Run: `grep -ri "WAM25\|wam25\|ScalingImpact\|Scaling Impact" src/ --include="*.tsx" --include="*.ts" -l`

Fix any remaining references found.

**Step 4: Commit**

```bash
git add src/components/LoginForm.tsx src/app/profile/page.tsx
git commit -m "rebrand: update login page and profile footer to WLM"
```

---

### Task 3: Database — Create Dimensions Table + Seed

**Files:**
- Create: `supabase/migrations/20260305000001_create_dimensions.sql`

**Step 1: Write migration**

```sql
-- Create dimensions table
CREATE TABLE IF NOT EXISTS public.dimensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    award_title TEXT NOT NULL,
    icon TEXT,
    sort_order INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed 6 dimensions
INSERT INTO public.dimensions (name, display_name, award_title, icon, sort_order) VALUES
    ('physical', 'Body Upgrade Mode', 'Strong Mode Champion of The Month', 'activity', 1),
    ('emotional', 'No Drama Zone', 'Most Positive Energy of The Month', 'heart', 2),
    ('mental', 'Brain Gym', 'Brain Star of The Month', 'brain', 3),
    ('social', 'Good Energy Circle', 'Team Connector of The Month', 'users', 4),
    ('spiritual', 'Inner Reset', 'Silent Power of The Month', 'sparkles', 5),
    ('professional', 'Level Up Career', 'Ownership Champion of The Month', 'briefcase', 6);

-- Enable RLS
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read dimensions
CREATE POLICY "Allow authenticated read dimensions"
    ON public.dimensions FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access dimensions"
    ON public.dimensions FOR ALL
    TO service_role
    USING (true);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000001_create_dimensions.sql
git commit -m "db: create dimensions table with 6 wellness dimensions"
```

---

### Task 4: Database — Add dimension_id to Quests & Activity Types

**Files:**
- Create: `supabase/migrations/20260305000002_add_dimension_to_quests_and_activities.sql`

**Step 1: Write migration**

```sql
-- Add dimension_id to quests table
ALTER TABLE public.quests
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Add dimension_id to activity_types table
ALTER TABLE public.activity_types
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Add dimension_id to point_adjustments table
ALTER TABLE public.point_adjustments
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_quests_dimension_id ON public.quests(dimension_id);
CREATE INDEX IF NOT EXISTS idx_activity_types_dimension_id ON public.activity_types(dimension_id);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_dimension_id ON public.point_adjustments(dimension_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000002_add_dimension_to_quests_and_activities.sql
git commit -m "db: add dimension_id to quests, activity_types, and point_adjustments"
```

---

### Task 5: Create Dimensions API

**Files:**
- Create: `src/app/api/dimensions/route.ts`

**Step 1: Write the API endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: dimensions, error } = await supabase
      .from('dimensions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ dimensions })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/dimensions/route.ts
git commit -m "feat: add dimensions API endpoint"
```

---

### Task 6: Update Admin Quest Create — Add Dimension Dropdown

**Files:**
- Modify: `src/app/api/admin/quests/create/route.ts`
- Modify: `src/app/dashboard/admin/page.tsx` (quest form section)

**Step 1: Update quest create API**

In `src/app/api/admin/quests/create/route.ts`, add `dimension_id` to the insert:

Find the body parsing section and add `dimension_id`:
```typescript
const { title, description, points, expires_at, verification_type, dimension_id } = body
```

Add `dimension_id` to the Supabase insert object:
```typescript
.insert({
  title,
  description: description || null,
  points,
  is_active: true,
  expires_at: expires_at || null,
  verification_type: verification_type || 'none',
  dimension_id: dimension_id || null,
})
```

**Step 2: Update admin quest form UI**

In `src/app/dashboard/admin/page.tsx`:

Add state for dimension selection (near line 344-348 with other quest states):
```typescript
const [questDimensionId, setQuestDimensionId] = useState('')
const [dimensions, setDimensions] = useState<Array<{id: string, name: string, display_name: string, icon: string}>>([])
```

Add fetch dimensions function (near other fetch functions):
```typescript
const fetchDimensions = async () => {
  const res = await fetch('/api/dimensions')
  const data = await res.json()
  if (data.dimensions) setDimensions(data.dimensions)
}
```

Call `fetchDimensions()` in the useEffect alongside other fetches.

Add dimension dropdown in the quest create form (after verification type dropdown, around line 2684):
```tsx
<div>
  <label className="block text-sm text-gray-400 mb-1">Dimension</label>
  <select
    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
    value={questDimensionId}
    onChange={(e) => setQuestDimensionId(e.target.value)}
  >
    <option value="">No Dimension</option>
    {dimensions.map((d) => (
      <option key={d.id} value={d.id}>{d.display_name}</option>
    ))}
  </select>
</div>
```

Add `dimension_id` to the quest create fetch body:
```typescript
dimension_id: questDimensionId || null,
```

Reset `questDimensionId` after successful creation:
```typescript
setQuestDimensionId('')
```

**Step 3: Commit**

```bash
git add src/app/api/admin/quests/create/route.ts src/app/dashboard/admin/page.tsx
git commit -m "feat: add dimension selection to quest creation"
```

---

### Task 7: Update Quest List API — Include Dimension Data

**Files:**
- Modify: `src/app/api/admin/quests/list/route.ts`

**Step 1: Update the select to include dimension**

Change the query to join with dimensions:
```typescript
const { data: quests, error } = await supabase
  .from('quests')
  .select('*, dimension:dimensions(id, name, display_name, icon)')
  .order('is_active', { ascending: false })
  .order('created_at', { ascending: false })
```

**Step 2: Commit**

```bash
git add src/app/api/admin/quests/list/route.ts
git commit -m "feat: include dimension data in quest list API"
```

---

### Task 8: Update Quest Cards UI — Show Dimension Label

**Files:**
- Modify: `src/components/DailyQuests.tsx`

**Step 1: Update DailyQuests component**

Import Lucide icons for dimensions (top of file):
```typescript
import { Activity, Heart, Brain, Users, Sparkles, Briefcase } from 'lucide-react'
```

Add dimension icon mapping helper:
```typescript
const dimensionIcons: Record<string, React.ComponentType<{className?: string}>> = {
  activity: Activity,
  heart: Heart,
  brain: Brain,
  users: Users,
  sparkles: Sparkles,
  briefcase: Briefcase,
}
```

In each quest card, add dimension badge (before the points badge, around line 122):
```tsx
{quest.dimension && (
  <span className="flex items-center gap-1 text-xs text-orange-300/70 bg-orange-500/10 px-2 py-0.5 rounded-full">
    {(() => {
      const IconComp = dimensionIcons[quest.dimension.icon]
      return IconComp ? <IconComp className="w-3 h-3" /> : null
    })()}
    {quest.dimension.display_name}
  </span>
)}
```

**Step 2: Commit**

```bash
git add src/components/DailyQuests.tsx
git commit -m "feat: show dimension label on quest cards"
```

---

### Task 9: Update Admin Quest List — Show Dimension Badge

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx` (quest list section around lines 1462-1499)

**Step 1: Add dimension badge to admin quest cards**

In the quest card display section, add dimension info next to the points badge:
```tsx
{quest.dimension && (
  <span className="text-xs text-orange-300/60 bg-orange-500/10 px-2 py-0.5 rounded-full">
    {quest.dimension.display_name}
  </span>
)}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/admin/page.tsx
git commit -m "feat: show dimension badge in admin quest list"
```

---

### Task 10: Update Activity Types Admin — Add Dimension to Activity Types

**Files:**
- Modify: `src/app/api/admin/activity-types/route.ts` (POST and PATCH handlers)
- Modify: `src/app/dashboard/admin/page.tsx` (activity type form)

**Step 1: Update activity types API**

In the POST handler, add `dimension_id` to the insert.
In the PATCH handler, add `dimension_id` to the update fields.
In the GET handler, add dimension join to the select:

```typescript
.select('*, dimension:dimensions(id, name, display_name)')
```

**Step 2: Update admin activity type form**

Add dimension dropdown to the activity type create/edit form, same pattern as quest form.

**Step 3: Commit**

```bash
git add src/app/api/admin/activity-types/route.ts src/app/dashboard/admin/page.tsx
git commit -m "feat: add dimension to activity type management"
```

---

### Task 11: Build & Verify Phase 1

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Fix any build errors**

If TypeScript errors exist, fix type definitions for dimension fields.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve Phase 1 build errors"
```

---

## Phase 2: Quest Templates + Photo Verification

### Task 12: Database — Create Quest Templates Table

**Files:**
- Create: `supabase/migrations/20260305000003_create_quest_templates.sql`

**Step 1: Write migration**

```sql
-- Quest templates for auto-recurring quests
CREATE TABLE IF NOT EXISTS public.quest_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dimension_id UUID REFERENCES public.dimensions(id),
    points INT NOT NULL DEFAULT 0,
    verification_type TEXT NOT NULL DEFAULT 'none',
    requires_photo BOOLEAN DEFAULT false,
    recurrence TEXT NOT NULL DEFAULT 'daily',
    trigger_type TEXT NOT NULL DEFAULT 'scheduled',
    linked_activity_type_id UUID REFERENCES public.activity_types(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access quest_templates"
    ON public.quest_templates FOR ALL
    TO service_role
    USING (true);

-- Add photo support to existing quest tables
ALTER TABLE public.quests
    ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.quest_templates(id);

ALTER TABLE public.user_quests
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_note TEXT;
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000003_create_quest_templates.sql
git commit -m "db: create quest_templates table and add photo verification columns"
```

---

### Task 13: Quest Template CRUD API

**Files:**
- Create: `src/app/api/admin/quest-templates/route.ts`

**Step 1: Write the API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await verifyAdminPermission('manage_content')
    const supabase = createSupabaseAdminClient()

    const { data: templates, error } = await supabase
      .from('quest_templates')
      .select('*, dimension:dimensions(id, name, display_name, icon), activity_type:activity_types(id, name)')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminPermission('manage_content')
    const supabase = createSupabaseAdminClient()
    const body = await req.json()

    const { title, description, dimension_id, points, verification_type, requires_photo, recurrence, trigger_type, linked_activity_type_id } = body

    if (!title || !points) {
      return NextResponse.json({ error: 'Title and points are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('quest_templates')
      .insert({
        title,
        description: description || null,
        dimension_id: dimension_id || null,
        points,
        verification_type: verification_type || 'none',
        requires_photo: requires_photo || false,
        recurrence: recurrence || 'daily',
        trigger_type: trigger_type || 'scheduled',
        linked_activity_type_id: linked_activity_type_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await verifyAdminPermission('manage_content')
    const supabase = createSupabaseAdminClient()
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('quest_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifyAdminPermission('manage_content')
    const supabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 })

    const { error } = await supabase
      .from('quest_templates')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/quest-templates/route.ts
git commit -m "feat: add quest template CRUD API"
```

---

### Task 14: Quest Generation API (From Templates)

**Files:**
- Create: `src/app/api/admin/quest-templates/generate/route.ts`
- Create: `src/lib/quest-templates.ts`

**Step 1: Write quest generation logic**

Create `src/lib/quest-templates.ts`:

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/server'

interface QuestTemplate {
  id: string
  title: string
  description: string | null
  dimension_id: string | null
  points: number
  verification_type: string
  requires_photo: boolean
  recurrence: string
  trigger_type: string
  linked_activity_type_id: string | null
}

export async function generateQuestsFromTemplates(triggerType: 'scheduled' | 'activity_linked', activityTypeId?: string) {
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('quest_templates')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', triggerType)

  if (triggerType === 'activity_linked' && activityTypeId) {
    query = query.eq('linked_activity_type_id', activityTypeId)
  }

  const { data: templates, error } = await query

  if (error || !templates?.length) return { generated: 0, error: error?.message }

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const questsToInsert = []

  for (const template of templates as QuestTemplate[]) {
    if (triggerType === 'scheduled') {
      const dayOfWeek = now.getDay()
      const dayOfMonth = now.getDate()

      if (template.recurrence === 'weekly' && dayOfWeek !== 1) continue // Monday only
      if (template.recurrence === 'monthly' && dayOfMonth !== 1) continue // 1st only
    }

    // Check if quest from this template already exists today
    const { data: existing } = await supabase
      .from('quests')
      .select('id')
      .eq('template_id', template.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)
      .limit(1)

    if (existing && existing.length > 0) continue // Already generated today

    // Calculate deadline
    let expiresAt: string | null = null
    if (template.recurrence === 'daily') {
      expiresAt = `${today}T23:59:59Z`
    } else if (template.recurrence === 'weekly') {
      const endOfWeek = new Date(now)
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
      expiresAt = endOfWeek.toISOString()
    } else if (template.recurrence === 'monthly') {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      expiresAt = endOfMonth.toISOString()
    }

    questsToInsert.push({
      title: template.title,
      description: template.description,
      points: template.points,
      dimension_id: template.dimension_id,
      verification_type: template.verification_type,
      requires_photo: template.requires_photo,
      template_id: template.id,
      is_active: true,
      expires_at: expiresAt,
    })
  }

  if (questsToInsert.length === 0) return { generated: 0 }

  const { error: insertError } = await supabase
    .from('quests')
    .insert(questsToInsert)

  if (insertError) return { generated: 0, error: insertError.message }

  return { generated: questsToInsert.length }
}
```

**Step 2: Write generate API endpoint**

Create `src/app/api/admin/quest-templates/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'
import { generateQuestsFromTemplates } from '@/lib/quest-templates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await verifyAdminPermission('manage_content')

    const body = await req.json().catch(() => ({}))
    const triggerType = body.trigger_type || 'scheduled'
    const activityTypeId = body.activity_type_id

    const result = await generateQuestsFromTemplates(triggerType, activityTypeId)

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/quest-templates.ts src/app/api/admin/quest-templates/generate/route.ts
git commit -m "feat: add quest generation from templates"
```

---

### Task 15: Activity-Linked Quest Trigger

**Files:**
- Modify: `src/app/api/admin/activities/route.ts` (POST handler)

**Step 1: Add activity-linked quest generation**

In the POST handler of activities route, after successfully creating the activity, add:

```typescript
import { generateQuestsFromTemplates } from '@/lib/quest-templates'

// After activity insert succeeds:
// Trigger activity-linked quest generation
if (typeId) {
  await generateQuestsFromTemplates('activity_linked', typeId).catch(() => {
    // Non-blocking: don't fail activity creation if quest generation fails
  })
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/activities/route.ts
git commit -m "feat: trigger activity-linked quests on activity creation"
```

---

### Task 16: Photo Upload on Quest Claim

**Files:**
- Modify: `src/app/api/quests/claim/route.ts`
- Modify: `src/components/DailyQuests.tsx`

**Step 1: Update claim API to accept photo**

In `src/app/api/quests/claim/route.ts`, update to handle photo uploads:

Add after the existing body parsing:
```typescript
const { questId, photo_url, verification_note } = body
```

Update the user_quests insert to include photo fields:
```typescript
.insert({
  user_id: userId,
  quest_id: questId,
  status: 'approved',
  photo_url: photo_url || null,
  verification_note: verification_note || null,
})
```

**Step 2: Update DailyQuests component for photo upload**

Add photo upload flow to the claim handler in `DailyQuests.tsx`:

```typescript
// Add state for photo modal
const [showPhotoModal, setShowPhotoModal] = useState(false)
const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
const [photoFile, setPhotoFile] = useState<File | null>(null)
const [verificationNote, setVerificationNote] = useState('')
```

Add photo upload helper:
```typescript
const uploadQuestPhoto = async (file: File, questId: string, userId: string) => {
  const supabase = createBrowserClient()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${questId}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('quest-proofs')
    .upload(path, file, { contentType: file.type })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('quest-proofs')
    .getPublicUrl(data.path)

  return publicUrl
}
```

Update claim handler to check `requires_photo`:
```typescript
const handleClaim = async (quest: Quest) => {
  if (quest.requires_photo) {
    setSelectedQuest(quest)
    setShowPhotoModal(true)
    return
  }
  // existing claim logic...
}
```

Add photo upload modal UI (before closing div of component):
```tsx
{showPhotoModal && selectedQuest && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full">
      <h3 className="text-lg font-bold mb-4">Upload Bukti</h3>
      <p className="text-sm text-gray-400 mb-4">{selectedQuest.title}</p>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
        className="w-full mb-4 text-sm"
      />
      <textarea
        placeholder="Catatan (opsional)..."
        value={verificationNote}
        onChange={(e) => setVerificationNote(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-3 py-2 text-sm mb-4"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setVerificationNote('') }}
          className="flex-1 py-2 rounded-lg bg-gray-800 text-sm"
        >
          Batal
        </button>
        <button
          onClick={async () => {
            if (!photoFile) return
            // Upload photo, then claim quest with photo_url
            // ... (integrate with existing claim flow)
          }}
          disabled={!photoFile}
          className="flex-1 py-2 rounded-lg bg-[#FC4C02] text-sm font-bold disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/app/api/quests/claim/route.ts src/components/DailyQuests.tsx
git commit -m "feat: add photo verification for quest claims"
```

---

### Task 17: Admin Quest Template Management UI

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`
- Modify: `src/app/dashboard/admin/components/AdminTabs.tsx`

**Step 1: Add "Templates" tab to admin**

In `AdminTabs.tsx`, add new tab type:
```typescript
type AdminTab = 'users' | 'quests' | 'surveys' | 'rewards' | 'activities' | 'spots' | 'doorprize' | 'admins' | 'templates'
```

Add tab entry with label "Quest Templates".

**Step 2: Add template management UI in admin page**

Add state variables for templates:
```typescript
const [questTemplates, setQuestTemplates] = useState<any[]>([])
const [templateTitle, setTemplateTitle] = useState('')
const [templateDesc, setTemplateDesc] = useState('')
const [templatePoints, setTemplatePoints] = useState('')
const [templateDimensionId, setTemplateDimensionId] = useState('')
const [templateRecurrence, setTemplateRecurrence] = useState('daily')
const [templateTriggerType, setTemplateTriggerType] = useState('scheduled')
const [templateVerificationType, setTemplateVerificationType] = useState('none')
const [templateRequiresPhoto, setTemplateRequiresPhoto] = useState(false)
const [templateLinkedActivityTypeId, setTemplateLinkedActivityTypeId] = useState('')
```

Add fetch/create/delete functions following the same pattern as quest management.

Add template list view + create form following the existing admin UI patterns.

Add "Generate Now" button that calls POST `/api/admin/quest-templates/generate`.

**Step 3: Commit**

```bash
git add src/app/dashboard/admin/page.tsx src/app/dashboard/admin/components/AdminTabs.tsx
git commit -m "feat: add quest template management in admin panel"
```

---

### Task 18: Supabase Storage — Create quest-proofs Bucket

**Files:**
- Create: `supabase/migrations/20260305000004_create_quest_proofs_bucket.sql`

**Step 1: Write migration for storage bucket**

```sql
-- Create quest-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-proofs', 'quest-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload quest proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'quest-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own proofs
CREATE POLICY "Users can read own quest proofs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'quest-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins (service role) to read all proofs
CREATE POLICY "Service role can read all quest proofs"
    ON storage.objects FOR SELECT
    TO service_role
    USING (bucket_id = 'quest-proofs');
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000004_create_quest_proofs_bucket.sql
git commit -m "db: create quest-proofs storage bucket with RLS policies"
```

---

### Task 19: Build & Verify Phase 2

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve Phase 2 build errors"
```

---

## Phase 3: Dimension Leaderboard + Dashboard

### Task 20: Update Leaderboard API — Dimension Filter

**Files:**
- Modify: `src/app/api/leaderboard/route.ts`
- Modify: `src/lib/gamification.ts`

**Step 1: Update gamification types**

In `src/lib/gamification.ts`, update `LeaderboardEntry` type:
```typescript
export type LeaderboardEntry = {
  user_id: string
  full_name: string
  avatar_url: string | null
  instagram_username: string | null
  total_steps: number
  quest_points: number
  overall_points: number
  dimension_points: Record<string, number>  // { physical: 50, emotional: 30, ... }
}
```

Update `computeLeaderboardEntries` to calculate per-dimension points:

```typescript
// For each user, compute dimension_points:
const dimensionPoints: Record<string, number> = {}

// From quests
for (const uq of userQuestsForUser) {
  const dimId = uq.quest?.dimension_id
  if (dimId) {
    dimensionPoints[dimId] = (dimensionPoints[dimId] || 0) + (uq.quest?.points || 0)
  }
}

// From point_adjustments
for (const adj of adjustmentsForUser) {
  const dimId = adj.dimension_id
  if (dimId) {
    dimensionPoints[dimId] = (dimensionPoints[dimId] || 0) + adj.points
  }
}
```

**Step 2: Update leaderboard API to accept dimension filter**

In `src/app/api/leaderboard/route.ts`, add query param handling:
```typescript
const { searchParams } = new URL(req.url)
const dimensionId = searchParams.get('dimension')
```

If `dimensionId` is provided, sort leaderboard by that dimension's points instead of overall.

**Step 3: Commit**

```bash
git add src/app/api/leaderboard/route.ts src/lib/gamification.ts
git commit -m "feat: add dimension filter to leaderboard"
```

---

### Task 21: Update Leaderboard UI — Dimension Tabs

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

**Step 1: Add dimension filter tabs**

Fetch dimensions from API and render as filter tabs above the leaderboard:

```tsx
const [dimensions, setDimensions] = useState<Dimension[]>([])
const [selectedDimension, setSelectedDimension] = useState<string>('overall')

// Fetch dimensions
useEffect(() => {
  fetch('/api/dimensions').then(r => r.json()).then(d => setDimensions(d.dimensions || []))
}, [])

// Filter tabs
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  <button
    onClick={() => setSelectedDimension('overall')}
    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
      selectedDimension === 'overall' ? 'bg-[#FC4C02] text-white' : 'bg-white/5 text-gray-400'
    }`}
  >
    Overall
  </button>
  {dimensions.map(d => (
    <button
      key={d.id}
      onClick={() => setSelectedDimension(d.id)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
        selectedDimension === d.id ? 'bg-[#FC4C02] text-white' : 'bg-white/5 text-gray-400'
      }`}
    >
      {d.display_name}
    </button>
  ))}
</div>
```

Pass `dimension` param to leaderboard API:
```typescript
const url = selectedDimension === 'overall'
  ? '/api/leaderboard'
  : `/api/leaderboard?dimension=${selectedDimension}`
```

**Step 2: Commit**

```bash
git add src/app/leaderboard/page.tsx
git commit -m "feat: add dimension filter tabs to leaderboard page"
```

---

### Task 22: Dashboard — 6 Dimension Progress Display

**Files:**
- Modify: `src/app/dashboard/page.tsx` (or wherever dashboard renders)

**Step 1: Create DimensionProgress component**

Create a section in the dashboard showing 6 dimension progress bars:

```tsx
// Fetch user's dimension points from leaderboard or a new endpoint
const DimensionProgress = ({ dimensionPoints, dimensions }: Props) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Life Mode Progress</h3>
    {dimensions.map(dim => {
      const points = dimensionPoints[dim.id] || 0
      const maxPoints = 100 // or calculate from max user
      const percent = Math.min((points / maxPoints) * 100, 100)
      return (
        <div key={dim.id} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 truncate">{dim.display_name}</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FC4C02] to-orange-400 rounded-full transition-all"
              style={{ width: `${percent}%`, opacity: 0.4 + (percent / 100) * 0.6 }}
            />
          </div>
          <span className="text-xs text-gray-400 w-12 text-right">{points}pts</span>
        </div>
      )
    })}
  </div>
)
```

**Step 2: Integrate into dashboard page**

Add DimensionProgress into the main dashboard view, fetching dimension data via the leaderboard or a dedicated endpoint.

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add 6-dimension progress display to dashboard"
```

---

### Task 23: Quest Page — Dimension Filter

**Files:**
- Modify: `src/app/quests/page.tsx`

**Step 1: Add dimension filter to quests page**

Same tab pattern as leaderboard — filter quests by dimension. Pass `dimension` filter when fetching quests, or filter client-side.

**Step 2: Commit**

```bash
git add src/app/quests/page.tsx
git commit -m "feat: add dimension filter to quests page"
```

---

### Task 24: Build & Verify Phase 3

**Step 1: Run build and tests**

Run: `npm run build && npx vitest run`
Expected: All pass

**Step 2: Commit fixes**

---

## Phase 4: Streak Events

### Task 25: Database — Streak Events + User Streaks

**Files:**
- Create: `supabase/migrations/20260305000005_create_streak_events.sql`

**Step 1: Write migration**

```sql
-- Streak events (admin-managed)
CREATE TABLE IF NOT EXISTS public.streak_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dimension_id UUID REFERENCES public.dimensions(id),
    multiplier_tiers JSONB NOT NULL DEFAULT '[
        {"days": 3, "multiplier": 1.25},
        {"days": 7, "multiplier": 1.5},
        {"days": 14, "multiplier": 1.75},
        {"days": 30, "multiplier": 2.0}
    ]'::jsonb,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    streak_event_id UUID REFERENCES public.streak_events(id) ON DELETE CASCADE NOT NULL,
    dimension_id UUID REFERENCES public.dimensions(id) NOT NULL,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_completed_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, streak_event_id, dimension_id)
);

-- RLS
ALTER TABLE public.streak_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read streak_events"
    ON public.streak_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access streak_events"
    ON public.streak_events FOR ALL TO service_role USING (true);

CREATE POLICY "Users can read own streaks"
    ON public.user_streaks FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow service role full access user_streaks"
    ON public.user_streaks FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streak_events_active ON public.streak_events(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id, streak_event_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000005_create_streak_events.sql
git commit -m "db: create streak_events and user_streaks tables"
```

---

### Task 26: Streak Logic Library

**Files:**
- Create: `src/lib/streaks.ts`

**Step 1: Write streak calculation logic**

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/server'

interface MultiplierTier {
  days: number
  multiplier: number
}

export function getStreakMultiplier(currentStreak: number, tiers: MultiplierTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.days - a.days)
  for (const tier of sorted) {
    if (currentStreak >= tier.days) return tier.multiplier
  }
  return 1.0
}

export async function updateUserStreak(userId: string, dimensionId: string) {
  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Find active streak events for this dimension (or all dimensions)
  const { data: events } = await supabase
    .from('streak_events')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .or(`dimension_id.eq.${dimensionId},dimension_id.is.null`)

  if (!events?.length) return { multiplier: 1.0 }

  let bestMultiplier = 1.0

  for (const event of events) {
    // Get or create user streak
    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_event_id', event.id)
      .eq('dimension_id', dimensionId)
      .single()

    let currentStreak = 1
    let longestStreak = 1

    if (existing) {
      const lastDate = existing.last_completed_date
      if (lastDate === today) {
        // Already counted today
        currentStreak = existing.current_streak
        longestStreak = existing.longest_streak
      } else {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastDate === yesterdayStr) {
          currentStreak = existing.current_streak + 1
        } else {
          currentStreak = 1 // Reset
        }
        longestStreak = Math.max(existing.longest_streak, currentStreak)

        await supabase
          .from('user_streaks')
          .update({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_completed_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      }
    } else {
      await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          streak_event_id: event.id,
          dimension_id: dimensionId,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today,
        })
    }

    const tiers = event.multiplier_tiers as MultiplierTier[]
    const multiplier = getStreakMultiplier(currentStreak, tiers)
    bestMultiplier = Math.max(bestMultiplier, multiplier)
  }

  return { multiplier: bestMultiplier }
}
```

**Step 2: Write test**

Create `src/lib/streaks.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getStreakMultiplier } from './streaks'

const defaultTiers = [
  { days: 3, multiplier: 1.25 },
  { days: 7, multiplier: 1.5 },
  { days: 14, multiplier: 1.75 },
  { days: 30, multiplier: 2.0 },
]

describe('getStreakMultiplier', () => {
  it('returns 1.0 for day 1-2', () => {
    expect(getStreakMultiplier(1, defaultTiers)).toBe(1.0)
    expect(getStreakMultiplier(2, defaultTiers)).toBe(1.0)
  })

  it('returns 1.25 for day 3-6', () => {
    expect(getStreakMultiplier(3, defaultTiers)).toBe(1.25)
    expect(getStreakMultiplier(6, defaultTiers)).toBe(1.25)
  })

  it('returns 1.5 for day 7-13', () => {
    expect(getStreakMultiplier(7, defaultTiers)).toBe(1.5)
    expect(getStreakMultiplier(13, defaultTiers)).toBe(1.5)
  })

  it('returns 2.0 for day 30+', () => {
    expect(getStreakMultiplier(30, defaultTiers)).toBe(2.0)
    expect(getStreakMultiplier(100, defaultTiers)).toBe(2.0)
  })
})
```

**Step 3: Run test**

Run: `npx vitest run src/lib/streaks.test.ts`
Expected: All pass

**Step 4: Commit**

```bash
git add src/lib/streaks.ts src/lib/streaks.test.ts
git commit -m "feat: add streak calculation logic with tests"
```

---

### Task 27: Integrate Streak into Quest Claim

**Files:**
- Modify: `src/app/api/quests/claim/route.ts`

**Step 1: Add streak update after successful claim**

After the user_quests insert succeeds:

```typescript
import { updateUserStreak } from '@/lib/streaks'

// After successful quest claim:
const quest = questData // the quest being claimed
if (quest.dimension_id) {
  const { multiplier } = await updateUserStreak(userId, quest.dimension_id)

  if (multiplier > 1.0) {
    const bonusPoints = Math.floor(quest.points * (multiplier - 1))
    if (bonusPoints > 0) {
      // Add bonus points via point_adjustments
      await supabase.from('point_adjustments').insert({
        user_id: userId,
        points: bonusPoints,
        reason: `Streak bonus (${multiplier}x) for quest: ${quest.title}`,
        dimension_id: quest.dimension_id,
        admin_id: null,
      })
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/quests/claim/route.ts
git commit -m "feat: apply streak multiplier bonus on quest claim"
```

---

### Task 28: Streak Events Admin CRUD API

**Files:**
- Create: `src/app/api/admin/streak-events/route.ts`

**Step 1: Write CRUD API**

Follow same pattern as `src/app/api/admin/quest-templates/route.ts` — GET, POST, PATCH, DELETE handlers for streak_events table. Include dimension join in GET.

**Step 2: Commit**

```bash
git add src/app/api/admin/streak-events/route.ts
git commit -m "feat: add streak events admin CRUD API"
```

---

### Task 29: Streak Events Admin UI

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`
- Modify: `src/app/dashboard/admin/components/AdminTabs.tsx`

**Step 1: Add "Streaks" tab**

Add `'streaks'` to AdminTab type. Add streak event management UI: list, create form (title, description, dimension, start/end date, multiplier tiers JSON editor, active toggle).

**Step 2: Commit**

```bash
git add src/app/dashboard/admin/page.tsx src/app/dashboard/admin/components/AdminTabs.tsx
git commit -m "feat: add streak events management in admin panel"
```

---

### Task 30: Streak Indicator in Quest UI

**Files:**
- Modify: `src/components/DailyQuests.tsx`

**Step 1: Add streak badge**

Fetch active streak events and user streaks. Show fire emoji + streak count + multiplier on quest cards:

```tsx
{streak && streak.current_streak > 0 && (
  <span className="text-xs text-orange-400">
    🔥 {streak.current_streak}d — {streak.multiplier}x
  </span>
)}
```

**Step 2: Commit**

```bash
git add src/components/DailyQuests.tsx
git commit -m "feat: show streak indicator on quest cards"
```

---

### Task 31: Build & Verify Phase 4

Run: `npm run build && npx vitest run`

---

## Phase 5: Monthly Awards + Polish

### Task 32: Database — Monthly Awards

**Files:**
- Create: `supabase/migrations/20260305000006_create_monthly_awards.sql`

**Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS public.monthly_awards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    dimension_id UUID REFERENCES public.dimensions(id) NOT NULL,
    period TEXT NOT NULL,
    award_title TEXT NOT NULL,
    points_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dimension_id, period)
);

ALTER TABLE public.monthly_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read monthly_awards"
    ON public.monthly_awards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access monthly_awards"
    ON public.monthly_awards FOR ALL TO service_role USING (true);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260305000006_create_monthly_awards.sql
git commit -m "db: create monthly_awards table"
```

---

### Task 33: Monthly Awards Finalization API

**Files:**
- Create: `src/app/api/admin/awards/finalize/route.ts`

**Step 1: Write finalization endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await verifyAdminPermission('*')
    const supabase = createSupabaseAdminClient()

    const body = await req.json().catch(() => ({}))
    const period = body.period // e.g. '2026-03'

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: 'Invalid period format (YYYY-MM)' }, { status: 400 })
    }

    // Check if already finalized
    const { data: existing } = await supabase
      .from('monthly_awards')
      .select('id')
      .eq('period', period)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This period is already finalized' }, { status: 400 })
    }

    // Get all dimensions
    const { data: dimensions } = await supabase
      .from('dimensions')
      .select('*')
      .eq('is_active', true)

    if (!dimensions) return NextResponse.json({ error: 'No dimensions found' }, { status: 500 })

    const [year, month] = period.split('-').map(Number)
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

    // Get quest points per user per dimension for this period
    const { data: questClaims } = await supabase
      .from('user_quests')
      .select('user_id, quest:quests(points, dimension_id)')
      .eq('status', 'approved')
      .gte('completed_at', startOfMonth)
      .lte('completed_at', endOfMonth)

    // Get point adjustments per user per dimension
    const { data: adjustments } = await supabase
      .from('point_adjustments')
      .select('user_id, points, dimension_id')
      .not('dimension_id', 'is', null)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    // Calculate totals per user per dimension
    const scores: Record<string, Record<string, number>> = {} // userId -> dimensionId -> points

    for (const claim of questClaims || []) {
      const quest = claim.quest as any
      if (!quest?.dimension_id) continue
      const uid = claim.user_id
      if (!scores[uid]) scores[uid] = {}
      scores[uid][quest.dimension_id] = (scores[uid][quest.dimension_id] || 0) + (quest.points || 0)
    }

    for (const adj of adjustments || []) {
      if (!adj.dimension_id) continue
      const uid = adj.user_id
      if (!scores[uid]) scores[uid] = {}
      scores[uid][adj.dimension_id] = (scores[uid][adj.dimension_id] || 0) + adj.points
    }

    // Find winner per dimension
    const awards = []

    for (const dim of dimensions) {
      let topUserId: string | null = null
      let topPoints = 0

      for (const [userId, dimScores] of Object.entries(scores)) {
        const pts = dimScores[dim.id] || 0
        if (pts > topPoints) {
          topPoints = pts
          topUserId = userId
        }
      }

      if (topUserId && topPoints > 0) {
        awards.push({
          user_id: topUserId,
          dimension_id: dim.id,
          period,
          award_title: dim.award_title,
          points_earned: topPoints,
        })
      }
    }

    if (awards.length > 0) {
      const { error } = await supabase.from('monthly_awards').insert(awards)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Send notifications to winners
      for (const award of awards) {
        await supabase.from('notifications').insert({
          user_id: award.user_id,
          title: `🏆 ${award.award_title}`,
          message: `Selamat! Kamu meraih ${award.award_title} untuk periode ${period} dengan ${award.points_earned} poin!`,
          type: 'award',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ awards, count: awards.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/awards/finalize/route.ts
git commit -m "feat: add monthly awards finalization API"
```

---

### Task 34: Monthly Awards in Admin UI

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

**Step 1: Add awards section**

Add a "Monthly Awards" section in the admin panel with:
- Period selector (month/year)
- "Finalize Awards" button
- List of past awards with winners per dimension

**Step 2: Commit**

```bash
git add src/app/dashboard/admin/page.tsx
git commit -m "feat: add monthly awards management in admin panel"
```

---

### Task 35: Profile — Awards Section

**Files:**
- Modify: `src/app/profile/page.tsx`

**Step 1: Add awards display**

Fetch user's awards and display as badges:

```tsx
// Fetch awards
const { data: awards } = await supabase
  .from('monthly_awards')
  .select('*, dimension:dimensions(name, display_name, icon)')
  .eq('user_id', userId)
  .order('period', { ascending: false })

// Display section
{awards && awards.length > 0 && (
  <div className="mt-6">
    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Awards</h3>
    <div className="grid grid-cols-2 gap-2">
      {awards.map(award => (
        <div key={award.id} className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs font-bold text-orange-400">{award.award_title}</div>
          <div className="text-xs text-gray-500">{award.period}</div>
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: show awards badges on user profile"
```

---

### Task 36: Final Build & Verify

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Verify key pages load**

Check: `/dashboard`, `/quests`, `/leaderboard`, `/profile`, `/dashboard/admin`

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final polish for WLM launch"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| **Phase 1** | Tasks 1-11 | Rebranding + dimensions table + quest/activity dimension support |
| **Phase 2** | Tasks 12-19 | Quest templates + photo verification + storage bucket |
| **Phase 3** | Tasks 20-24 | Dimension leaderboard + dashboard progress + quest filters |
| **Phase 4** | Tasks 25-31 | Streak events + multiplier logic + admin UI |
| **Phase 5** | Tasks 32-36 | Monthly awards + profile badges + final polish |

**Total: 36 tasks across 5 phases**

**New tables**: dimensions, quest_templates, streak_events, user_streaks, monthly_awards
**Modified tables**: quests, activity_types, point_adjustments, user_quests
**New APIs**: 6 new API routes
**Modified APIs**: 5 existing routes updated
**New library files**: quest-templates.ts, streaks.ts
