# OPELLE BUILD PLAN
**Generated: March 19, 2026 — Phase 1 Investigation**
**Codebase: `/opelle-app-github/` — Next.js 16 + Supabase + Vercel**

---

## Area 1 — Messaging System (Broken -> Fixed)

### Root Cause / Current State

**"No workspace found" error from practitioner side:**
The send route (`src/app/api/messages/send/route.ts:16-24`) resolves workspace by querying `workspaces` where `owner_id = user.id`. This uses the **user-scoped Supabase client** (RLS-aware). If the authenticated user's session token doesn't match the workspace owner's `auth.uid()`, the RLS policy on `workspaces` blocks the SELECT and returns null — producing the "No workspace found" 404. This is the same pattern that works on other pages because they use `createSupabaseAdminClient` for workspace lookup (bypassing RLS). The `messages/send` route is the one API route that uses the server client for the workspace lookup instead of admin.

**Client messages not appearing in practitioner history:**
The messaging system does NOT log activity to the `activity_log` table. The `createMessage()` function in `src/lib/db/messaging.ts` inserts into `messages` and updates thread counters, but never calls `logActivity()`. Neither the practitioner send route nor the client reply route (`src/app/api/client/messages/reply/route.ts`) log to activity. The History page (`src/app/app/history/page.tsx`) only reads from `activity_log` — it has no "message" entity type filter, no "message.sent" or "message.received" action label.

**History showing UUIDs instead of names:**
The `activity_log.entity_label` stores whatever string is passed at log time. For appointments, the label is set correctly. But there is no message activity logging at all currently, so this is about ensuring any future logging uses client names, not IDs.

### Exact Files to Change
| File | Change |
|------|--------|
| `src/app/api/messages/send/route.ts` | Switch workspace lookup from `createSupabaseServerClient` to `createSupabaseAdminClient` (same pattern as `intelligence/chat/route.ts`) |
| `src/lib/db/messaging.ts` | No changes needed — functions are correct |
| `src/lib/db/activity-log.ts` | Add `"message.sent"` and `"message.received"` to `ActivityAction` type; add `"message"` to `EntityType` |
| `src/app/api/messages/send/route.ts` | Add `logActivity("message.sent", "message", thread.id, clientName)` after successful send |
| `src/app/api/client/messages/reply/route.ts` | Add `logActivity("message.received", "message", threadId, clientName)` after successful send |
| `src/app/app/history/page.tsx` | Add "Messages" filter chip and icon mapping for the "message" entity type |

### DB Migrations Required
None — uses existing `activity_log` table.

### Risk Level: **Low**
Straightforward fix. The workspace lookup pattern is proven in other routes. Activity logging follows an established pattern.

### Decisions Needed
None.

---

## Area 2 — Metis AI Prompts (Dynamic Context)

### Root Cause / Current State

**Good news: The Metis system is already largely dynamic.**

**Starters (`src/app/api/intelligence/starters/route.ts`):** Already dynamic. Queries upcoming appointments, low-stock products, overdue rebook clients, and unread message counts. Falls back to generic salon knowledge prompts only when fewer than 4 contextual prompts are available. This is well-built.

**Chat context (`src/app/api/intelligence/chat/route.ts`):** Already includes:
- Total client count, product count, recent 10 appointments
- Full client detail + formula history + appointment history when a client name is mentioned
- Product inventory (low stock + all products) when product keywords detected
- All data passed via `workspaceContext` to `mentisChat()` in the kernel

**What's missing/improvable:**
1. No upcoming-appointment context in the chat system prompt (starters have it, but chat doesn't pass it)
2. No pending actions context (unconfirmed appointments, unreviewed inspo submissions, overdue tasks)
3. Starters don't check for inspo submissions awaiting review or unconfirmed bookings

### Exact Files to Change
| File | Change |
|------|--------|
| `src/app/api/intelligence/chat/route.ts` | Add upcoming appointments (next 48h) and pending tasks to `workspaceContext` |
| `src/app/api/intelligence/starters/route.ts` | Add starters for: unreviewed inspo submissions, pending rebook requests, overdue tasks |

### DB Migrations Required
None.

### Risk Level: **Low**
Additive changes only. Existing functionality is correct and stays untouched.

### Decisions Needed
None.

---

## Area 3 — Booking Flow (Broken + Major Upgrade)

### Root Cause / Current State

**"Could not load suggested times" error:**
The client-side slot picker (`src/app/client/(portal)/book/slots/page.tsx`) calls `/api/client/appointments/slots`. This API route (`src/app/api/client/appointments/slots/route.ts`) has **three fallback auth methods**:
1. Cookie-based auth -> `client_users` lookup
2. Query param fallback (`workspaceId` + `clientId`)
3. Service type fallback (lookup workspace from `service_types` table)

The error likely occurs because the slot picker page passes `serviceId` as a query param but the cookie auth fails on Vercel (known issue — the code has a comment about this). The third fallback creates a fake `clientUser` with `client_id: "anonymous"`, but the **existing appointment query** then filters by `status = "scheduled"` only — it does NOT include `"pending_confirmation"` or other statuses, which means recently-introduced statuses could cause issues.

**However**, the more likely root cause is the appointment query at line 138: `.eq("status", "scheduled")`. If the status values in the DB don't match (e.g., appointments were inserted with a different status string), zero appointments are found and the query returns unexpected results. Need to check if recent migrations changed the status enum or if new appointment creation is using different status values.

The `suggest-slots` route (`src/app/api/appointments/suggest-slots/route.ts`) also filters `.in("status", ["scheduled"])` at line 101 — same issue.

**Working hours:**
- **Stored in DB**: Yes. `workspaces.working_hours` is a JSONB column. The `BookingConfig` component (`src/app/app/settings/_components/BookingConfig.tsx`) reads/writes working hours to the DB via `/api/settings/booking`.
- **Both slot routes read from DB**: The client slots API reads `workspace.working_hours` and falls back to `DEFAULT_HOURS` (lines 91-102). The suggest-slots API also reads from DB with a fallback to `DEFAULT_WORKING_HOURS` (lines 18-26).
- **Buffer time**: Stored in `workspaces.buffer_minutes`, read by the client slots API. The suggest-slots API uses a hardcoded 15-min buffer instead (line 111).
- **Booking window**: Stored in `workspaces.booking_window_days`, read by client slots API.
- **Slot durations**: Per-service durations stored in `service_types.default_duration_mins`, read by client slots API. The suggest-slots API receives `durationMins` as a parameter (defaults to 60 if not provided — line 65).

**Calendar (`V7Calendar.tsx`):**
- Accepts `workingHours` prop and uses it to grey out closed hours
- Has a hardcoded `DEFAULT_WORKING` fallback (lines 58-66) used when no workspace hours provided
- **No drag-and-drop**: Calendar is read-only — clicking an empty slot navigates to "new appointment" form. No drag support exists despite `react-dnd` being in `package.json`.
- **No inline editing**: Clicking an appointment navigates to the detail page.

**Appointment status flow:**
- Current types: `'scheduled' | 'completed' | 'cancelled'` (from `src/lib/types.ts:57`)
- No `'pending_confirmation'` status exists
- No 24-hour auto-release mechanism exists
- No confirmation flow exists from client side

**Current booking flows:**
1. **Instant booking** (client picks slot directly): `slots/page.tsx` -> `/api/client/appointments` POST -> creates with status `"scheduled"`
2. **Request booking** (client submits preferences): `request/page.tsx` -> `/api/client/appointments/request` POST -> creates `rebook_requests` row with status `"pending"`

The request flow creates a `rebook_request`, but there is **no practitioner UI to view/approve rebook requests** and **no flow to convert a rebook_request into an appointment**. The `RebookRequestsList` component exists at `src/app/app/appointments/_components/RebookRequestsList.tsx` but needs to be verified.

### Exact Files to Change
| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `'pending_confirmation'` to `AppointmentStatus` type |
| `src/app/api/client/appointments/slots/route.ts` | Include `pending_confirmation` in status filter for occupied slots |
| `src/app/api/appointments/suggest-slots/route.ts` | Include `pending_confirmation` in status filter; use `workspace.buffer_minutes` instead of hardcoded 15 |
| `src/app/api/appointments/suggest-slots/route.ts` | Read `buffer_minutes` from workspace instead of hardcoded 15-min buffer |
| `src/lib/db/appointments.ts` | Add `confirmAppointment()` function; update `createAppointment()` to support `pending_confirmation` status |
| `src/app/api/appointments/requests/[id]/route.ts` | Build out the practitioner approve/confirm endpoint |
| `src/app/api/client/appointments/route.ts` | Add PATCH for client to confirm/decline pending appointment |
| `src/app/app/appointments/_components/V7Calendar.tsx` | Add distinct color for `pending_confirmation` status; implement drag-and-drop with `react-dnd` |
| `src/app/app/appointments/_components/RebookRequestsList.tsx` | Connect to API for practitioner to select time and create pending appointment |
| `src/app/app/appointments/[id]/page.tsx` | Add edit capability (service, time, notes, duration) |
| `src/app/api/cron/release-pending/route.ts` | **New file** — cron job to auto-release unconfirmed appointments after 24h |
| `src/app/app/appointments/_components/BookingSuggestionModal.tsx` | Wire up for practitioner to suggest times when approving a rebook request |

### DB Migrations Required
```sql
-- Add pending_confirmation to appointments status check
-- (Supabase may not have a CHECK constraint — verify; if it does, alter it)
-- Add confirmed_at column for tracking when client confirmed
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
-- Add expires_at column for 24h auto-release
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

### Risk Level: **High**
This is the largest area — new booking flow, new appointment status, drag-and-drop, cron job, and multiple API changes. Core booking functionality depends on this.

### Decisions — ALL DECIDED
1. **24-hour auto-release:** **DECIDED** — Vercel cron job (runs every 15 min, cancels expired pending appointments).
2. **Calendar colors:** **DECIDED** — Brass/gold full block for pending, garnet full block for confirmed, blue full block for completed. Entire appointment block is the status color, not just a side bar.
3. **Drag-and-drop:** **DECIDED** — Reschedule only. Dragging moves an existing appointment to a new time slot.

---

## Area 4 — Inspo Photos + AI Analysis (Broken + Upgrade)

### Root Cause / Current State

**AI analysis IS triggering.** The inspo POST route (`src/app/api/client/inspo/route.ts`) calls `analyzeInspo()` via the kernel, stores results in `inspo_submissions.ai_analysis`, and creates notifications. The `InspoUploader` component shows an "Analyzing your inspo..." spinner. The concern may be that the kernel's `analyzeInspo` function is failing silently — it's wrapped in try/catch and continues without AI analysis if it fails (line 190-193).

**What IS missing is the in-app follow-up screen flow.**
Currently, after upload, `onSubmitted()` is called and the user is returned to the inspo list. There is NO per-photo follow-up question screen. The `ConsultFormClient` component (`src/app/client/(portal)/inspo/[consultId]/_components/ConsultFormClient.tsx`) exists and shows AI-generated questions, but:
1. It's a separate page the client navigates to (via notification link), not an inline flow after upload
2. It shows questions for the whole submission, not per-photo
3. Photos are not prominently displayed above their questions

**Inspo photos in practitioner client profile:**
The `InspoTab` component (`src/app/app/clients/[id]/_components/InspoTab.tsx`) already exists and shows:
- Photo thumbnails, expanded photo grid
- AI analysis results (feasibility badge, stylist flag, client summary, demand signals)
- Consult form answers
- Mark Reviewed button

It's loaded in `ClientDetailTabs` — so inspo photos DO appear in the practitioner client profile already.

**Unicode escape `\u2014` issue:**
Found in 5 files:
1. `src/app/app/products/[id]/_components/InventoryPredictionCard.tsx:81` — in a ternary expression string
2. `src/app/api/client/inspo/route.ts:246` — task title string
3. `src/app/api/client/inspo/route.ts:261` — notification title string
4. `src/app/client/(portal)/inspo/_components/InspoUploader.tsx:236` — placeholder string
5. `src/app/api/client/inspo/[consultId]/route.ts:133` — notification title string

Note: In JSX/TypeScript, `"\u2014"` inside a string literal actually renders correctly as `—`. The issue the doc describes ("literal `\u2014` rendering") would only happen if the escape is double-escaped (e.g., `"\\u2014"`) or in a context where the string is not being processed as JS. These need to be checked — they might render fine. But to be safe, replace all with the actual `—` character.

### Exact Files to Change
| File | Change |
|------|--------|
| `src/app/client/(portal)/inspo/_components/InspoUploader.tsx` | After upload success, instead of calling `onSubmitted()`, navigate to a new per-photo follow-up flow |
| `src/app/client/(portal)/inspo/_components/InspoFollowUp.tsx` | **New file** — per-photo follow-up screen: shows each photo prominently with 2-3 AI-generated questions beneath it |
| `src/app/api/client/inspo/route.ts` | Return `generatedFormQuestions` grouped per photo (currently they're not photo-specific); fix `\u2014` |
| `src/app/client/(portal)/inspo/_components/InspoUploader.tsx` | Fix `\u2014` in placeholder |
| `src/app/app/products/[id]/_components/InventoryPredictionCard.tsx` | Fix `\u2014` |
| `src/app/api/client/inspo/[consultId]/route.ts` | Fix `\u2014` |

### DB Migrations Required
```sql
-- Add photo_index to consult questions (to associate questions with specific photos)
-- This may be handled in the ai_analysis JSONB — no schema change needed if we structure the JSON correctly
```

### Risk Level: **Medium**
The AI analysis pipeline exists and works (assuming kernel is healthy). The main work is building the per-photo follow-up UI flow and restructuring how questions are associated with specific photos.

### Decisions Needed
1. **Per-photo questions from AI**: **DECIDED** — Update the kernel prompt to return questions grouped by photo. Cleaner than guessing associations client-side.
2. **Quick-select options**: **DECIDED** — AI generates questions with pre-generated response options plus a free-text "clarify" option. After the client responds, the system re-scans their answers to check for follow-up questions. This loop repeats until no further system follow-ups are needed. This creates a conversational intake flow driven entirely by the AI.

---

## Area 5 — Aftercare (Stub -> Real Feature)

### Root Cause / Current State

**Client portal:** Confirmed stub. `src/app/client/(portal)/aftercare/page.tsx` shows "Aftercare plans are coming in Phase 4" with a dashed-border card. No real content.

**Practitioner side:**
- The appointment detail page (`src/app/app/appointments/[id]/page.tsx`) has a "Service Log" section that says "coming soon" (line 147-155). It mentions "aftercare instructions" in the placeholder text.
- There is NO aftercare field on the appointment form or detail view.
- The `ServiceLog` type in `types.ts:76-84` already has `aftercareNotes?: string` — so the type system anticipates it.
- The `ServiceLogRow` type has `aftercare_notes: string | null`.

**Database:**
- The `appointments` table row type (`AppointmentRow`) does NOT have an `aftercare_notes` column.
- The `service_logs` table exists (based on types) with `aftercare_notes` — but it's a separate table linked by `appointment_id`, not a column on appointments.
- The `aftercare_plans` table exists (from migration — RLS policies reference it). The `AftercarePlan` type in `types.ts:324-332` includes `clientVisibleNotes`, `recommendedProducts`, `publishedAt`.

**So there are TWO existing aftercare patterns:**
1. `service_logs.aftercare_notes` — per-appointment service log
2. `aftercare_plans` — dedicated table with richer structure

**DECIDED:** Use the existing `aftercare_plans` table — it already has `client_visible_notes`, `recommended_products`, `published_at` (controls client visibility via RLS), and RLS policies are already defined. This gives us the best upgrade path for adding recommended products and publish control later.

### Exact Files to Change
| File | Change |
|------|--------|
| `src/lib/db/aftercare.ts` | **New file** — query layer for `aftercare_plans` table: create, update, get by appointment, get by client |
| `src/app/api/aftercare/route.ts` | **New file** — practitioner CRUD for aftercare plans |
| `src/app/api/aftercare/[id]/route.ts` | **New file** — GET/PATCH/DELETE single aftercare plan |
| `src/app/app/appointments/[id]/page.tsx` | Replace "Service Log coming soon" with aftercare editor (plain textarea for `client_visible_notes`, publish toggle) |
| `src/app/app/clients/[id]/page.tsx` | Add "Aftercare" section showing published aftercare plans across appointments |
| `src/app/client/(portal)/aftercare/page.tsx` | Replace stub with real aftercare display: most recent + history (only shows where `published_at IS NOT NULL` via RLS) |
| `src/app/api/client/aftercare/route.ts` | **New file** — client portal API to fetch published aftercare plans |

### DB Migrations Required
None — `aftercare_plans` table already exists with correct schema and RLS policies.

### Risk Level: **Low**
Simple column addition, straightforward UI. No complex logic.

### Decisions Needed
1. **Rich text or plain text for aftercare?** **DECIDED** — Plain text (textarea) for now. Can upgrade to rich text later.
2. **Which table for aftercare?** **DECIDED** — Use the existing `aftercare_plans` table (has `client_visible_notes`, `recommended_products`, `published_at` for visibility control). This is the best path for future upgrades since the schema already supports richer structure. Skip adding `aftercare_notes` column to appointments.

---

## Area 6 — Per-Client Permissions

### Root Cause / Current State

**Does not exist.** There is:
- No `client_permissions` column on the `clients` table
- No permissions checks on any client portal actions
- No permissions UI in the practitioner client profile
- No JSONB field or separate permissions table

The client profile page (`src/app/app/clients/[id]/page.tsx`) shows Contact, Tags, Notes cards + Stylist Intelligence + Rebook Intelligence + Appointments + Formula History/Inspo tabs. There is no "Portal Permissions" section.

The client portal has no permission gating — all features are available to all clients.

### Exact Files to Change
| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `ClientPermissions` type with `can_self_book`, `can_message`, `can_upload_inspo`, `can_view_formulas`; add `permissions?: ClientPermissions` to `Client` type; add `permissions` to `ClientRow` |
| `src/lib/db/clients.ts` | Include permissions in client queries; add `updateClientPermissions()` function |
| `src/app/api/clients/[id]/permissions/route.ts` | **New file** — PATCH endpoint for updating permissions |
| `src/app/app/clients/[id]/_components/PortalPermissions.tsx` | **New file** — toggle UI for permissions in client profile |
| `src/app/app/clients/[id]/page.tsx` | Add `<PortalPermissions>` component to profile page |
| `src/app/api/client/permissions/route.ts` | **New file** — GET endpoint for client portal to check own permissions |
| `src/lib/client-auth.ts` | Add permission fetching to client context |
| `src/app/client/(portal)/book/page.tsx` | Check `can_self_book` before showing booking options |
| `src/app/client/(portal)/messages/page.tsx` | Check `can_message` before showing compose |
| `src/app/client/(portal)/inspo/page.tsx` | Check `can_upload_inspo` before showing upload |
| `src/app/client/(portal)/layout.tsx` | Conditionally hide nav items based on permissions |

### DB Migrations Required
```sql
-- Add permissions JSONB column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_self_book": false, "can_message": false, "can_upload_inspo": false, "can_view_formulas": false}';
```

### Risk Level: **Medium**
The permissions themselves are simple. The risk is in enforcement — every client portal feature needs a permission check, and missing one could leave a gap. Need thorough testing.

### Decisions Needed
1. **Default for NEW clients:** **DECIDED** — All permissions default to OFF. Practitioner must explicitly enable each feature per client. This ensures stylists consciously opt clients into portal features.
2. **Friendly message text:** **DECIDED** — "Your stylist manages this for you." Same wording across all features.

---

## Dynamism Audit — Hardcoded Values Found

| File | Line | Hardcoded Value | Should Be | Fixed in This Session? |
|------|------|----------------|-----------|----------------------|
| `src/app/api/appointments/suggest-slots/route.ts` | 18-26 | `DEFAULT_WORKING_HOURS` (Mon-Fri 9-5) | DB `workspaces.working_hours` | Yes (already falls back to DB; remove default or keep as safe fallback) |
| `src/app/api/appointments/suggest-slots/route.ts` | 111 | Hardcoded 15-min buffer | DB `workspaces.buffer_minutes` | Yes |
| `src/app/api/client/appointments/slots/route.ts` | 91-99 | `DEFAULT_HOURS` (Mon-Sat 9-6/5, Sun closed) | DB `workspaces.working_hours` | Already reads from DB; default is fallback — acceptable |
| `src/app/api/appointments/suggest-slots/route.ts` | 65 | `durationMins = 60` default | Should require explicit duration from service type | Yes |
| `src/app/app/appointments/_components/V7Calendar.tsx` | 56 | `HOURS = 8AM-8PM` display range | Could derive from working hours | Low priority — display range, not logic |
| `src/app/app/appointments/_components/V7Calendar.tsx` | 58-66 | `DEFAULT_WORKING` (Mon-Sat 9-6, Sun closed) | Already falls back to prop `workingHours` from DB | Acceptable fallback |
| `src/app/api/intelligence/starters/route.ts` | 80-85 | Fallback prompt strings (salon knowledge) | These are generic fallbacks when no contextual data exists | Acceptable — fallbacks only |
| `src/lib/db/appointments.ts` | 114 | `durationMins || 60` default | Service type duration from DB | Yes (should require explicit value) |
| `src/app/app/settings/_components/BookingConfig.tsx` | 49-54 | Default working hours in component state init | Initial values from DB props; these are UI defaults for new setups | Acceptable |
| `src/app/api/intelligence/chat/route.ts` | 105 | Product keyword list for context triggering | Could be more dynamic, but acceptable for v1 | Future migration |

---

## Order of Operations

The areas have these dependencies:
- Area 1 (Messaging) is **independent** — can be done first
- Area 2 (Metis) is **independent** — can be done in parallel with Area 1
- Area 3 (Booking) is **the largest** and mostly independent, but the new statuses affect calendar display
- Area 4 (Inspo) depends on kernel AI being functional — independent of other areas
- Area 5 (Aftercare) is **independent** — requires DB migration first
- Area 6 (Permissions) is **independent** but should be done after Areas 1, 3, 4 are working (since permissions gate those features)

### Recommended Build Order

```
1. Area 1 — Messaging Fix          (30 min)  [unblocks immediate testing]
2. Area 5 — Aftercare              (45 min)  [simple, quick win, DB migration]
3. Area 3 — Booking Flow           (3+ hrs)  [largest, most complex]
   3a. Fix suggest-slots hardcoded values
   3b. Add pending_confirmation status
   3c. Build practitioner approve flow
   3d. Build client confirm flow + 24h expiry
   3e. Calendar drag-and-drop
   3f. Appointment inline editing
4. Area 4 — Inspo Follow-up Flow   (1.5 hrs) [per-photo question screens]
   4a. Fix unicode escapes
   4b. Build per-photo follow-up UI
5. Area 2 — Metis Enhancements     (30 min)  [additive, low risk]
6. Area 6 — Per-Client Permissions  (1.5 hrs) [last — gates features from 1,3,4]
7. Area 7 — Final Audit Report     (20 min)
```

### DB Migrations — Run First (Single Migration)
```sql
-- Run before any code changes
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS permissions JSONB
  DEFAULT '{"can_self_book": false, "can_message": false, "can_upload_inspo": false, "can_view_formulas": false}';
-- Note: aftercare uses existing aftercare_plans table — no new columns needed
```

---

## Summary of All Decisions Needing Owner Approval

| # | Area | Decision | Answer |
|---|------|----------|--------|
| 1 | 3 | Vercel cron vs Supabase edge function for 24h auto-release? | **DECIDED: Vercel cron** |
| 2 | 3 | Color for pending appointments on calendar? | **DECIDED: Brass full block = pending, Garnet full block = confirmed, Blue full block = completed** |
| 3 | 3 | Drag = reschedule only? | **DECIDED: Yes — reschedule only** |
| 4 | 4 | Per-photo questions: update kernel prompt or associate by index? | **DECIDED: Update kernel prompt** |
| 5 | 4 | Quick-select options: predefined or AI-generated? | **DECIDED: AI-generated questions with pre-generated responses + free-text clarify. Re-scan loop until no follow-ups remain.** |
| 6 | 5 | Rich text or plain text for aftercare? | **DECIDED: Plain text** |
| 7 | 5 | Which table for aftercare? | **DECIDED: Use existing `aftercare_plans` table (better upgrade path)** |
| 8 | 6 | New client default permissions: all ON? | **DECIDED: All OFF by default** |
| 9 | 6 | Exact "permission off" message wording? | **DECIDED: "Your stylist manages this for you"** |

---

*All 9 decisions are now locked. No application code has been modified. Ready for Phase 2 build.*
