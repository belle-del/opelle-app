# Booking & Scheduling System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-stylist availability patterns and overrides on top of the existing workspace-level booking infrastructure, with a hybrid mode controlled by `allow_individual_availability`.

**Architecture:** Evolve `service_types` and `workspaces` in-place, add two new tables (`availability_patterns`, `availability_overrides`), enhance the existing slot calculation endpoint to respect per-stylist schedules, and build UI for availability setup in `/app/availability` and a toggle in the existing settings page.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase/Postgres with admin client in API routes, Tailwind + Opelle design system (Fraunces/DM Sans, garnet #8B3A3A, brass #C4AB70)

---

## Context for the Implementer

- Project root: `/Users/anabellelord/Opelle/opelle-app-github`
- API routes: `src/app/api/`
- App pages: `src/app/app/`
- DB helpers: `src/lib/db/`
- Types: `src/lib/types.ts`
- Always use `createSupabaseAdminClient()` in API routes (bypasses RLS). Use `createSupabaseServerClient()` only to get `user.id`.
- Workspace auth pattern: get user from `supabase.auth.getUser()`, then call `getWorkspaceId(user.id)` from `src/lib/db/get-workspace-id.ts`.
- RLS must have both `USING` and `WITH CHECK` on all policies.
- Use `gen_random_uuid()` — never `uuid_generate_v4()`.
- Existing booking settings PATCH endpoint: `src/app/api/settings/booking/route.ts`
- Existing slot calculation: `src/app/api/client/appointments/slots/route.ts` — references `service.default_duration_mins` (will change to `duration_minutes` after migration)
- `service_types` column `default_duration_mins` → renamed to `duration_minutes` in this migration
- Existing `BookingConfig` component: `src/app/app/settings/_components/BookingConfig.tsx` — already handles working_hours, buffer_minutes, booking_window_days via PATCH to `/api/settings/booking`

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/2026-03-30-booking-scheduling.sql`

**Step 1: Write the migration**

```sql
-- migrations/2026-03-30-booking-scheduling.sql
-- Module 7: Booking & Scheduling

-- 1. Workspace: add allow_individual_availability flag
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS allow_individual_availability BOOLEAN DEFAULT false NOT NULL;

-- 2. service_types: rename default_duration_mins → duration_minutes, add buffer_minutes + deposit_required
ALTER TABLE service_types
  RENAME COLUMN default_duration_mins TO duration_minutes;

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS buffer_minutes INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false NOT NULL;

-- 3. availability_patterns: per-stylist recurring weekly schedule
CREATE TABLE IF NOT EXISTS availability_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id, day_of_week, effective_from)
);

ALTER TABLE availability_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owner manages availability_patterns"
  ON availability_patterns
  FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_availability_patterns_workspace
  ON availability_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_availability_patterns_user
  ON availability_patterns(workspace_id, user_id);

-- 4. availability_overrides: date-specific exceptions
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id, override_date)
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owner manages availability_overrides"
  ON availability_overrides
  FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_availability_overrides_workspace
  ON availability_overrides(workspace_id);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_user_date
  ON availability_overrides(workspace_id, user_id, override_date);
```

**Step 2: Verify SQL looks correct**
Read the file back and confirm:
- `gen_random_uuid()` used (not `uuid_generate_v4`)
- Both `USING` and `WITH CHECK` on both RLS policies
- Indexes on both new tables
- `IF NOT EXISTS` guards on all CREATE statements
- `IF NOT EXISTS` on all `ADD COLUMN` statements

**Step 3: Commit**

```bash
git add migrations/2026-03-30-booking-scheduling.sql
git commit -m "feat: add availability_patterns and availability_overrides migration"
```

---

## Task 2: Update Types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Update `WorkspaceRow` and `Workspace`**

In `WorkspaceRow` (around line 362), add fields that exist in the DB but are missing from the type:

```typescript
export type WorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  booking_window_days: number | null;
  buffer_minutes: number | null;
  working_hours: Record<string, { start: string; end: string; closed: boolean }> | null;
  allow_individual_availability: boolean;
  created_at: string;
  updated_at: string;
};
```

In `Workspace` (around line 6), add:

```typescript
export type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  bookingWindowDays: number;
  bufferMinutes: number;
  workingHours: Record<string, { start: string; end: string; closed: boolean }> | null;
  allowIndividualAvailability: boolean;
  createdAt: string;
  updatedAt: string;
};
```

In `workspaceRowToModel` (around line 512), add mappings:

```typescript
export function workspaceRowToModel(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    bookingWindowDays: row.booking_window_days ?? 60,
    bufferMinutes: row.buffer_minutes ?? 0,
    workingHours: row.working_hours ?? null,
    allowIndividualAvailability: row.allow_individual_availability,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Step 2: Update `ServiceTypeRow`, `ServiceType`, and `serviceTypeRowToModel`**

`ServiceTypeRow` — rename field, add new fields:

```typescript
export type ServiceTypeRow = {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  duration_minutes: number | null;        // was default_duration_mins
  buffer_minutes: number | null;
  deposit_required: boolean;
  booking_type: string | null;
  created_at: string;
};
```

`ServiceType` — update model:

```typescript
export type ServiceType = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  durationMinutes?: number;               // was defaultDurationMins
  bufferMinutes: number;
  depositRequired: boolean;
  bookingType?: BookingType;
  createdAt: string;
};
```

`serviceTypeRowToModel` — update mapping:

```typescript
export function serviceTypeRowToModel(row: ServiceTypeRow): ServiceType {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sortOrder: row.sort_order,
    durationMinutes: row.duration_minutes ?? undefined,
    bufferMinutes: row.buffer_minutes ?? 0,
    depositRequired: row.deposit_required,
    bookingType: row.booking_type as BookingType | undefined,
    createdAt: row.created_at,
  };
}
```

**Step 3: Add AvailabilityPattern types**

Append after the inventory types (end of file):

```typescript
// Availability Patterns
export type AvailabilityPatternRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityPattern = {
  id: string;
  workspaceId: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export function availabilityPatternRowToModel(row: AvailabilityPatternRow): AvailabilityPattern {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    breakStart: row.break_start,
    breakEnd: row.break_end,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Availability Overrides
export type AvailabilityOverrideRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  override_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityOverride = {
  id: string;
  workspaceId: string;
  userId: string;
  overrideDate: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function availabilityOverrideRowToModel(row: AvailabilityOverrideRow): AvailabilityOverride {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    overrideDate: row.override_date,
    isAvailable: row.is_available,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Step 4: Fix renamed field reference in slots endpoint**

In `src/app/api/client/appointments/slots/route.ts`, find the line:
```typescript
if (service?.default_duration_mins) {
  durationMins = service.default_duration_mins;
```

Change to:
```typescript
if (service?.duration_minutes) {
  durationMins = service.duration_minutes;
```

Also update the `.select()` call above it (find `"default_duration_mins"` and change to `"duration_minutes"`).

**Step 5: Fix any other references to `default_duration_mins`**

Run:
```bash
grep -rn "default_duration_mins\|defaultDurationMins" src/ --include="*.ts" --include="*.tsx"
```

For each hit, update to `duration_minutes` / `durationMinutes` as appropriate.

**Step 6: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors (or only pre-existing unrelated errors). Fix any errors introduced by this task before continuing.

**Step 7: Commit**

```bash
git add src/lib/types.ts src/app/api/client/appointments/slots/route.ts
git commit -m "feat: add availability types, update ServiceType and Workspace types for booking"
```

---

## Task 3: DB Helper — Availability

**Files:**
- Create: `src/lib/db/availability.ts`

**Step 1: Write the helper module**

```typescript
// src/lib/db/availability.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AvailabilityPattern,
  AvailabilityPatternRow,
  AvailabilityOverride,
  AvailabilityOverrideRow,
  availabilityPatternRowToModel,
  availabilityOverrideRowToModel,
} from "@/lib/types";
import {
  availabilityPatternRowToModel as patternToModel,
  availabilityOverrideRowToModel as overrideToModel,
} from "@/lib/types";

// --- Availability Patterns ---

export async function listAvailabilityPatterns(
  workspaceId: string,
  userId?: string
): Promise<AvailabilityPattern[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("availability_patterns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("day_of_week", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listAvailabilityPatterns: ${error.message}`);
  return (data as AvailabilityPatternRow[]).map(patternToModel);
}

export async function upsertAvailabilityPattern(
  pattern: Omit<AvailabilityPatternRow, "id" | "created_at" | "updated_at">
): Promise<AvailabilityPattern> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("availability_patterns")
    .upsert(pattern, {
      onConflict: "workspace_id,user_id,day_of_week,effective_from",
    })
    .select("*")
    .single();

  if (error) throw new Error(`upsertAvailabilityPattern: ${error.message}`);
  return patternToModel(data as AvailabilityPatternRow);
}

export async function deleteAvailabilityPattern(
  id: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error, count } = await admin
    .from("availability_patterns")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  return !error && (count ?? 0) > 0;
}

// --- Availability Overrides ---

export async function listAvailabilityOverrides(
  workspaceId: string,
  userId: string,
  from?: string,
  to?: string
): Promise<AvailabilityOverride[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("availability_overrides")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("override_date", { ascending: true });

  if (from) query = query.gte("override_date", from);
  if (to) query = query.lte("override_date", to);

  const { data, error } = await query;
  if (error) throw new Error(`listAvailabilityOverrides: ${error.message}`);
  return (data as AvailabilityOverrideRow[]).map(overrideToModel);
}

export async function upsertAvailabilityOverride(
  override: Omit<AvailabilityOverrideRow, "id" | "created_at" | "updated_at">
): Promise<AvailabilityOverride> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("availability_overrides")
    .upsert(override, {
      onConflict: "workspace_id,user_id,override_date",
    })
    .select("*")
    .single();

  if (error) throw new Error(`upsertAvailabilityOverride: ${error.message}`);
  return overrideToModel(data as AvailabilityOverrideRow);
}

export async function deleteAvailabilityOverride(
  id: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error, count } = await admin
    .from("availability_overrides")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  return !error && (count ?? 0) > 0;
}
```

**Step 2: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 3: Commit**

```bash
git add src/lib/db/availability.ts
git commit -m "feat: add availability DB helper (patterns + overrides)"
```

---

## Task 4: API Routes — Availability Patterns

**Files:**
- Create: `src/app/api/booking/availability/patterns/route.ts`
- Create: `src/app/api/booking/availability/patterns/[id]/route.ts`

**Step 1: Write GET + POST for patterns**

```typescript
// src/app/api/booking/availability/patterns/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import {
  listAvailabilityPatterns,
  upsertAvailabilityPattern,
} from "@/lib/db/availability";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? undefined;

  const patterns = await listAvailabilityPatterns(workspaceId, userId);
  return NextResponse.json({ patterns });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const body = await request.json();
  const { userId, dayOfWeek, startTime, endTime, breakStart, breakEnd, effectiveFrom } = body;

  if (!userId || dayOfWeek === undefined || !startTime || !endTime || !effectiveFrom) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "dayOfWeek must be 0–6" }, { status: 400 });
  }

  const pattern = await upsertAvailabilityPattern({
    workspace_id: workspaceId,
    user_id: userId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    break_start: breakStart ?? null,
    break_end: breakEnd ?? null,
    effective_from: effectiveFrom,
    effective_to: body.effectiveTo ?? null,
  });

  return NextResponse.json({ pattern }, { status: 201 });
}
```

**Step 2: Write DELETE for a single pattern**

```typescript
// src/app/api/booking/availability/patterns/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { deleteAvailabilityPattern } from "@/lib/db/availability";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const deleted = await deleteAvailabilityPattern(id, workspaceId);

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

**Step 3: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

**Step 4: Commit**

```bash
git add src/app/api/booking/availability/patterns/route.ts src/app/api/booking/availability/patterns/[id]/route.ts
git commit -m "feat: add availability patterns API endpoints (GET, POST, DELETE)"
```

---

## Task 5: API Routes — Availability Overrides

**Files:**
- Create: `src/app/api/booking/availability/overrides/route.ts`

**Step 1: Write GET + POST for overrides**

```typescript
// src/app/api/booking/availability/overrides/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import {
  listAvailabilityOverrides,
  upsertAvailabilityOverride,
  deleteAvailabilityOverride,
} from "@/lib/db/availability";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const overrides = await listAvailabilityOverrides(workspaceId, userId, from, to);
  return NextResponse.json({ overrides });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const body = await request.json();
  const { userId, overrideDate, isAvailable, startTime, endTime, notes } = body;

  if (!userId || !overrideDate || isAvailable === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // If available, must have times
  if (isAvailable && (!startTime || !endTime)) {
    return NextResponse.json(
      { error: "start_time and end_time required when is_available is true" },
      { status: 400 }
    );
  }

  const override = await upsertAvailabilityOverride({
    workspace_id: workspaceId,
    user_id: userId,
    override_date: overrideDate,
    is_available: isAvailable,
    start_time: isAvailable ? startTime : null,
    end_time: isAvailable ? endTime : null,
    notes: notes ?? null,
  });

  return NextResponse.json({ override }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const deleted = await deleteAvailabilityOverride(id, workspaceId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

**Step 2: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

**Step 3: Commit**

```bash
git add src/app/api/booking/availability/overrides/route.ts
git commit -m "feat: add availability overrides API endpoints (GET, POST, DELETE)"
```

---

## Task 6: Enhance Settings Booking API + BookingConfig

**Files:**
- Modify: `src/app/api/settings/booking/route.ts`
- Modify: `src/app/app/settings/_components/BookingConfig.tsx`
- Modify: `src/app/app/settings/page.tsx`

**Step 1: Add `allow_individual_availability` to the PATCH endpoint**

In `src/app/api/settings/booking/route.ts`, find the destructure line:

```typescript
const { workspaceId, bookingWindowDays, bufferMinutes, workingHours } = await request.json();
```

Change to:

```typescript
const { workspaceId, bookingWindowDays, bufferMinutes, workingHours, allowIndividualAvailability } = await request.json();
```

And in the `updates` block, add:

```typescript
if (allowIndividualAvailability !== undefined) updates.allow_individual_availability = allowIndividualAvailability;
```

**Step 2: Update `BookingConfig` component**

In `BookingConfig.tsx`:

1. Add `allowIndividualAvailability: boolean` to `Props`
2. Add `initialAllowIndividualAvailability: boolean` to props destructure
3. Add state: `const [allowIndividualAvailability, setAllowIndividualAvailability] = useState(initialAllowIndividualAvailability)`
4. Include in the PATCH body: `allowIndividualAvailability`
5. Add toggle UI below the existing settings:

```tsx
{/* Individual Stylist Availability */}
<div style={{ borderTop: "1px solid var(--stone-200)", paddingTop: 16, marginTop: 8 }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-on-stone)" }}>
        Individual Stylist Availability
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginTop: 2 }}>
        Allow stylists to set their own schedule that overrides workspace hours
      </p>
    </div>
    <button
      type="button"
      onClick={() => setAllowIndividualAvailability(prev => !prev)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: allowIndividualAvailability ? "var(--garnet, #8B3A3A)" : "var(--stone-300, #ccc)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
      aria-label="Toggle individual availability"
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: allowIndividualAvailability ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
        }}
      />
    </button>
  </div>
</div>
```

**Step 3: Update settings page to pass the new prop**

In `src/app/app/settings/page.tsx`, update the `BookingConfig` render to pass `initialAllowIndividualAvailability={workspace?.allow_individual_availability ?? false}`.

**Step 4: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

**Step 5: Commit**

```bash
git add src/app/api/settings/booking/route.ts src/app/app/settings/_components/BookingConfig.tsx src/app/app/settings/page.tsx
git commit -m "feat: add allow_individual_availability toggle to booking settings"
```

---

## Task 7: Enhance Slots Endpoint for Per-Stylist Availability

**Files:**
- Modify: `src/app/api/client/appointments/slots/route.ts`

**Step 1: Update the workspace select to include the new flag**

Find the `.select("working_hours, buffer_minutes, booking_window_days")` line and change to:

```typescript
.select("working_hours, buffer_minutes, booking_window_days, allow_individual_availability")
```

**Step 2: Add per-stylist availability resolution after workspace fetch**

After the existing code that sets `rawHours` and `bufferMinutes`, add:

```typescript
const stylistId = searchParams.get("stylist_id");
const allowIndividual = (workspace as Record<string, unknown>).allow_individual_availability as boolean | null;

// If individual availability is enabled and a stylist is specified, check their patterns
let effectiveHours: WorkingHours = workingHours;

if (allowIndividual && stylistId) {
  // Get today's date for effective pattern lookup
  const todayStr = toLocalDateString(today);

  // Check for an override on each requested date — will handle per-date below
  // Get all patterns for this stylist (active as of today)
  const { data: patterns } = await admin
    .from("availability_patterns")
    .select("day_of_week, start_time, end_time, break_start, break_end")
    .eq("workspace_id", clientUser.workspace_id)
    .eq("user_id", stylistId)
    .lte("effective_from", todayStr)
    .or("effective_to.is.null,effective_to.gte." + todayStr);

  if (patterns && patterns.length > 0) {
    // Build a WorkingHours-shaped object from the patterns
    const stylistHours: WorkingHours = {};
    for (const p of patterns) {
      const dayName = DAY_NAMES[p.day_of_week];
      stylistHours[dayName] = {
        start: p.start_time.slice(0, 5),
        end: p.end_time.slice(0, 5),
        closed: false,
      };
    }
    // Fill remaining days as closed
    for (const day of DAY_NAMES) {
      if (!stylistHours[day]) {
        stylistHours[day] = { start: "09:00", end: "18:00", closed: true };
      }
    }
    effectiveHours = stylistHours;
  }
}
```

**Step 3: Apply overrides per date**

In the slot generation loop, before using `dayHours`, add override check. Change the loop opening from:

```typescript
for (const date of dates) {
  const dayName = DAY_NAMES[date.getDay()];
  const dayHours = workingHours[dayName];
```

To:

```typescript
// Fetch overrides for stylist if applicable
const overridesByDate: Record<string, { is_available: boolean; start_time: string | null; end_time: string | null }> = {};
if (allowIndividual && stylistId) {
  const startRange2 = toLocalDateString(dates[0] || today);
  const endRange2 = toLocalDateString(dates[dates.length - 1] || today);
  const { data: overrides } = await admin
    .from("availability_overrides")
    .select("override_date, is_available, start_time, end_time")
    .eq("workspace_id", clientUser.workspace_id)
    .eq("user_id", stylistId)
    .gte("override_date", startRange2)
    .lte("override_date", endRange2);

  for (const ov of overrides || []) {
    overridesByDate[ov.override_date] = ov;
  }
}

for (const date of dates) {
  const dayName = DAY_NAMES[date.getDay()];
  const dateKey = toLocalDateString(date);

  // Check for a date-specific override
  const override = overridesByDate[dateKey];
  let dayHours: WorkingHours[string];

  if (override) {
    if (!override.is_available) continue; // blocked day
    dayHours = {
      start: override.start_time?.slice(0, 5) ?? "09:00",
      end: override.end_time?.slice(0, 5) ?? "18:00",
      closed: false,
    };
  } else {
    dayHours = effectiveHours[dayName];
  }
```

Remove the existing `const dateKey = toLocalDateString(date);` line that appears later in the loop since it's now declared above.

**Step 4: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors. If `dateKey` is declared twice, remove the duplicate.

**Step 5: Commit**

```bash
git add src/app/api/client/appointments/slots/route.ts
git commit -m "feat: enhance slot calculation to respect per-stylist availability patterns and overrides"
```

---

## Task 8: Availability Setup Page

**Files:**
- Create: `src/app/app/availability/page.tsx`
- Create: `src/app/app/availability/_components/WeeklyScheduleEditor.tsx`
- Create: `src/app/app/availability/_components/OverridesPanel.tsx`

**Step 1: Write the server component page**

```typescript
// src/app/app/availability/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listAvailabilityPatterns, listAvailabilityOverrides } from "@/lib/db/availability";
import { WeeklyScheduleEditor } from "./_components/WeeklyScheduleEditor";
import { OverridesPanel } from "./_components/OverridesPanel";

export default async function AvailabilityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: workspace } = await admin
    .from("workspaces")
    .select("allow_individual_availability, working_hours, buffer_minutes")
    .eq("id", workspaceId)
    .single();

  const allowIndividual = workspace?.allow_individual_availability ?? false;

  // Load this user's existing patterns and overrides
  const [patterns, overrides] = await Promise.all([
    listAvailabilityPatterns(workspaceId, user.id),
    listAvailabilityOverrides(workspaceId, user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
          Scheduling
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)" }}>
          My Availability
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-on-stone-faint)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
          Set the days and hours you're available to take appointments.
        </p>
      </header>

      {!allowIndividual ? (
        <div style={{ padding: 16, borderRadius: 8, background: "var(--cream, #FAF8F5)", border: "1px solid var(--stone-200)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-on-stone-faint)" }}>
          Individual availability is managed at the workspace level. To enable per-stylist schedules, turn on <strong>Individual Stylist Availability</strong> in Settings → Booking.
        </div>
      ) : (
        <>
          <WeeklyScheduleEditor
            workspaceId={workspaceId}
            userId={user.id}
            initialPatterns={patterns}
          />
          <OverridesPanel
            workspaceId={workspaceId}
            userId={user.id}
            initialOverrides={overrides}
          />
        </>
      )}
    </div>
  );
}
```

**Step 2: Write `WeeklyScheduleEditor`**

This is a "use client" component that:
- Shows Mon–Sun as rows
- Each row: day name, on/off toggle, start time input, end time input, optional break window (breakStart / breakEnd)
- On toggle or time change, POSTs to `/api/booking/availability/patterns`
- On toggle off, DELETEs the pattern for that day
- Shows saving state per row

```typescript
// src/app/app/availability/_components/WeeklyScheduleEditor.tsx
"use client";

import { useState } from "react";
import type { AvailabilityPattern } from "@/lib/types";

const DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

type DayState = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  patternId?: string;
  saving: boolean;
  error?: string;
};

type Props = {
  workspaceId: string;
  userId: string;
  initialPatterns: AvailabilityPattern[];
};

function buildInitialState(initialPatterns: AvailabilityPattern[]): Record<number, DayState> {
  const byDay: Record<number, AvailabilityPattern> = {};
  for (const p of initialPatterns) byDay[p.dayOfWeek] = p;

  const state: Record<number, DayState> = {};
  for (const d of DAYS) {
    const p = byDay[d.value];
    state[d.value] = {
      enabled: !!p,
      startTime: p?.startTime.slice(0, 5) ?? "09:00",
      endTime: p?.endTime.slice(0, 5) ?? "18:00",
      breakStart: p?.breakStart?.slice(0, 5) ?? "",
      breakEnd: p?.breakEnd?.slice(0, 5) ?? "",
      patternId: p?.id,
      saving: false,
    };
  }
  return state;
}

export function WeeklyScheduleEditor({ workspaceId, userId, initialPatterns }: Props) {
  const [days, setDays] = useState<Record<number, DayState>>(() => buildInitialState(initialPatterns));

  function update(dayOfWeek: number, patch: Partial<DayState>) {
    setDays(prev => ({ ...prev, [dayOfWeek]: { ...prev[dayOfWeek], ...patch } }));
  }

  async function saveDay(dayOfWeek: number) {
    const day = days[dayOfWeek];
    update(dayOfWeek, { saving: true, error: undefined });

    if (!day.enabled) {
      // Delete pattern if it exists
      if (day.patternId) {
        const res = await fetch(`/api/booking/availability/patterns/${day.patternId}`, { method: "DELETE" });
        if (res.ok) {
          update(dayOfWeek, { saving: false, patternId: undefined });
        } else {
          update(dayOfWeek, { saving: false, error: "Failed to remove" });
        }
      } else {
        update(dayOfWeek, { saving: false });
      }
      return;
    }

    const res = await fetch("/api/booking/availability/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        dayOfWeek,
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart || null,
        breakEnd: day.breakEnd || null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      update(dayOfWeek, { saving: false, patternId: data.pattern.id });
    } else {
      update(dayOfWeek, { saving: false, error: "Failed to save" });
    }
  }

  return (
    <div style={{ background: "var(--cream, #FAF8F5)", borderRadius: 12, border: "1px solid var(--stone-200)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-200)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)" }}>
          Weekly Schedule
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginTop: 2 }}>
          Set your recurring availability. Changes save automatically.
        </p>
      </div>

      {DAYS.map(({ label, value }) => {
        const day = days[value];
        return (
          <div
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 20px",
              borderBottom: "1px solid var(--stone-100)",
              background: day.enabled ? "white" : "transparent",
              opacity: day.saving ? 0.7 : 1,
            }}
          >
            {/* Day toggle */}
            <div style={{ width: 100, display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  update(value, { enabled: !day.enabled });
                  setTimeout(() => saveDay(value), 0);
                }}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: day.enabled ? "var(--garnet, #8B3A3A)" : "var(--stone-300, #ccc)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 2,
                  left: day.enabled ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "white",
                  transition: "left 0.2s",
                }} />
              </button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: day.enabled ? "var(--text-on-stone)" : "var(--text-on-stone-faint)" }}>
                {label}
              </span>
            </div>

            {/* Time inputs */}
            {day.enabled && (
              <>
                <input
                  type="time"
                  value={day.startTime}
                  onChange={e => update(value, { startTime: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "4px 8px" }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)" }}>to</span>
                <input
                  type="time"
                  value={day.endTime}
                  onChange={e => update(value, { endTime: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "4px 8px" }}
                />

                {/* Break */}
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginLeft: 8 }}>Break:</span>
                <input
                  type="time"
                  value={day.breakStart}
                  placeholder="--:--"
                  onChange={e => update(value, { breakStart: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "4px 8px", width: 100 }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)" }}>–</span>
                <input
                  type="time"
                  value={day.breakEnd}
                  placeholder="--:--"
                  onChange={e => update(value, { breakEnd: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "4px 8px", width: 100 }}
                />
              </>
            )}

            {day.error && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--garnet)" }}>{day.error}</span>
            )}
            {day.saving && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)" }}>Saving…</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Write `OverridesPanel`**

This is a "use client" component that:
- Lists existing overrides (date, available/blocked, times if available)
- Form to add a new override: date picker, is_available toggle, conditional start/end time
- Delete button on each override

```typescript
// src/app/app/availability/_components/OverridesPanel.tsx
"use client";

import { useState } from "react";
import type { AvailabilityOverride } from "@/lib/types";

type Props = {
  workspaceId: string;
  userId: string;
  initialOverrides: AvailabilityOverride[];
};

export function OverridesPanel({ workspaceId, userId, initialOverrides }: Props) {
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>(initialOverrides);
  const [date, setDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!date) { setError("Date is required"); return; }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/booking/availability/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, overrideDate: date, isAvailable, startTime: isAvailable ? startTime : null, endTime: isAvailable ? endTime : null, notes: notes || null }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setOverrides(prev => [...prev.filter(o => o.overrideDate !== date), data.override].sort((a, b) => a.overrideDate.localeCompare(b.overrideDate)));
      setDate("");
      setNotes("");
    } else {
      setError("Failed to save override");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/booking/availability/overrides?id=${id}`, { method: "DELETE" });
    if (res.ok) setOverrides(prev => prev.filter(o => o.id !== id));
  }

  return (
    <div style={{ background: "var(--cream, #FAF8F5)", borderRadius: 12, border: "1px solid var(--stone-200)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-200)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)" }}>
          Date Overrides
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginTop: 2 }}>
          Block out specific dates or set custom hours for a day.
        </p>
      </div>

      {/* Existing overrides */}
      {overrides.length > 0 && (
        <div style={{ padding: "8px 20px" }}>
          {overrides.map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--stone-100)" }}>
              <div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-on-stone)" }}>{o.overrideDate}</span>
                {o.isAvailable ? (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginLeft: 8 }}>{o.startTime?.slice(0,5)} – {o.endTime?.slice(0,5)}</span>
                ) : (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet, #8B3A3A)", marginLeft: 8 }}>Blocked</span>
                )}
                {o.notes && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginLeft: 8 }}>{o.notes}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(o.id)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--garnet)", border: "none", background: "none", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add override form */}
      <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "6px 10px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Type</label>
          <select
            value={isAvailable ? "available" : "blocked"}
            onChange={e => setIsAvailable(e.target.value === "available")}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "6px 10px" }}
          >
            <option value="blocked">Blocked (day off)</option>
            <option value="available">Available (custom hours)</option>
          </select>
        </div>

        {isAvailable && (
          <>
            <div>
              <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>From</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "6px 10px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>To</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "6px 10px" }} />
            </div>
          </>
        )}

        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Holiday" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200)", borderRadius: 6, padding: "6px 10px", width: 160 }} />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: "var(--garnet, #8B3A3A)", color: "white", border: "none", borderRadius: 6, padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Add Override"}
        </button>

        {error && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet)" }}>{error}</p>}
      </div>
    </div>
  );
}
```

**Step 4: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

**Step 5: Commit**

```bash
git add src/app/app/availability/
git commit -m "feat: add availability setup page with weekly schedule editor and date overrides"
```

---

## Task 9: Enhance Appointments Management View

**Files:**
- Modify: `src/app/app/appointments/page.tsx`
- Create: `src/app/app/appointments/_components/AppointmentFilters.tsx`
- Create: `src/app/app/appointments/_components/PendingConfirmationBanner.tsx`

**Step 1: Check current appointments page structure**

Read `src/app/app/appointments/page.tsx` fully before editing.

**Step 2: Write `PendingConfirmationBanner`**

```typescript
// src/app/app/appointments/_components/PendingConfirmationBanner.tsx
"use client";

import { useState } from "react";

type PendingAppointment = {
  id: string;
  clientName: string;
  serviceName: string;
  startAt: string;
};

type Props = {
  pending: PendingAppointment[];
};

export function PendingConfirmationBanner({ pending }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  if (dismissed || pending.length === 0) return null;

  async function handleAction(id: string, action: "confirm" | "cancel") {
    setActioning(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "confirm" ? "scheduled" : "cancelled" }),
    });
    setActioning(null);
    window.location.reload();
  }

  return (
    <div style={{ background: "var(--garnet-deep, #5C1F1F)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--garnet-blush, #F5E6E6)", marginBottom: 6 }}>
            {pending.length} booking request{pending.length > 1 ? "s" : ""} awaiting confirmation
          </p>
          {pending.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet-blush)" }}>
                {p.clientName} — {p.serviceName} ({new Date(p.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })})
              </span>
              <button
                type="button"
                onClick={() => handleAction(p.id, "confirm")}
                disabled={actioning === p.id}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: "white", color: "var(--garnet)", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => handleAction(p.id, "cancel")}
                disabled={actioning === p.id}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: "transparent", color: "var(--garnet-blush)", border: "1px solid var(--garnet-blush)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
              >
                Decline
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: "var(--garnet-blush)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}
```

**Step 3: Add PendingConfirmationBanner to appointments page**

In `src/app/app/appointments/page.tsx`:

1. Query pending appointments from DB using admin client:
```typescript
const { data: pendingAppts } = await admin
  .from("appointments")
  .select("id, service_name, start_at, client_id")
  .eq("workspace_id", workspaceId)
  .eq("status", "pending_confirmation")
  .order("start_at", { ascending: true });
```

2. Fetch client names for the pending appointments if any:
```typescript
const clientIds = [...new Set((pendingAppts || []).map(a => a.client_id))];
const clientNamesMap: Record<string, string> = {};
if (clientIds.length > 0) {
  const { data: clients } = await admin
    .from("clients")
    .select("id, first_name, last_name")
    .in("id", clientIds);
  for (const c of clients || []) {
    clientNamesMap[c.id] = `${c.first_name} ${c.last_name || ""}`.trim();
  }
}

const pendingForBanner = (pendingAppts || []).map(a => ({
  id: a.id,
  clientName: clientNamesMap[a.client_id] || "Client",
  serviceName: a.service_name,
  startAt: a.start_at,
}));
```

3. Render `<PendingConfirmationBanner pending={pendingForBanner} />` above the calendar.

**Step 4: Check for PATCH /api/appointments/[id] endpoint**

Run:
```bash
ls /Users/anabellelord/Opelle/opelle-app-github/src/app/api/appointments/[id]/ 2>/dev/null || echo "no [id] route"
```

If the route doesn't have a PATCH handler for status changes, add one:
```typescript
// In the existing route file or create src/app/api/appointments/[id]/route.ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const validStatuses = ["scheduled", "completed", "cancelled", "pending_confirmation"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const updates: Record<string, unknown> = { status };
  if (status === "scheduled") updates.confirmed_at = new Date().toISOString();

  const { error } = await admin
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Step 5: TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

**Step 6: Commit**

```bash
git add src/app/app/appointments/ src/app/api/appointments/
git commit -m "feat: add pending confirmation banner to appointments management view"
```

---

## Task 10: Add Availability Nav Link

**Files:**
- Modify: The sidebar/nav component (find with: `grep -rn "appointments\|products\|settings" src/app/app/ --include="*.tsx" -l | head -5`)

**Step 1: Find the nav component**

```bash
grep -rn "href.*appointments\|href.*settings\|href.*products" /Users/anabellelord/Opelle/opelle-app-github/src/app/app/ --include="*.tsx" -l | head -5
```

**Step 2: Add availability link**

Add a nav item: `{ href: "/app/availability", label: "Availability" }` adjacent to the appointments link.

**Step 3: Commit**

```bash
git commit -am "feat: add Availability to sidebar navigation"
```

---

## Final Verification

**Step 1: Full TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1
```

Expected: zero new errors.

**Step 2: Run dev server and smoke test**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npm run dev
```

Manually verify:
- [ ] Settings → Booking shows the Individual Availability toggle
- [ ] Toggle saves to DB (check Supabase dashboard)
- [ ] `/app/availability` loads and shows "managed at workspace level" message when flag is off
- [ ] Enable the flag in settings, then `/app/availability` shows the weekly editor
- [ ] Add a pattern for Monday 09:00–17:00 — verify POST succeeds
- [ ] Add a blocked override for a future date — verify it appears
- [ ] Appointments page shows pending confirmation banner (if any pending_confirmation rows exist)
- [ ] SQL migration has all correct syntax (review migration file)

**Step 3: Provide SQL migration to user**

The user will run `migrations/2026-03-30-booking-scheduling.sql` in Supabase SQL editor.

---

## Migration SQL (for Supabase)

Run the contents of `migrations/2026-03-30-booking-scheduling.sql` in the Supabase SQL editor.

> ⚠️ The `RENAME COLUMN` for `service_types.default_duration_mins → duration_minutes` is irreversible. Verify no other queries reference `default_duration_mins` before running.
