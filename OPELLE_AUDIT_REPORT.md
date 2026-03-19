# Opelle Build Audit Report

**Date:** March 20, 2026
**Phase:** Phase 2 Build — All 6 Areas Complete

---

## Area 1 — Messaging System: FIXED

**Problem:** "No workspace found" error + messages missing from History.

**What changed:**
- `src/app/api/messages/send/route.ts` — Switched workspace lookup from RLS-scoped server client to admin client. Added `logActivity("message.sent")` with resolved client name.
- `src/app/api/client/messages/reply/route.ts` — Added `logActivity("message.received")` with resolved client name.
- `src/lib/db/activity-log.ts` — Added `"message.sent"`, `"message.received"` actions and `"message"` entity type.
- `src/app/app/history/page.tsx` — Added "Messages" filter chip, `MessageSquare` icon, and action labels.

---

## Area 2 — Metis AI Context: ENHANCED

**Problem:** Chat lacked upcoming appointment and task context; starters didn't surface inspo/rebook/tasks.

**What changed:**
- `src/app/api/intelligence/chat/route.ts` — Added upcoming appointments (next 48h) and pending tasks to `workspaceContext`.
- `src/app/api/intelligence/starters/route.ts` — Added starters for unreviewed inspo submissions, pending rebook requests, and overdue tasks.

---

## Area 3 — Booking Flow: FIXED + UPGRADED

**Problem:** Hardcoded buffer, no pending confirmation flow, no drag-and-drop, single status color.

**What changed:**

**Types:**
- `src/lib/types.ts` — Added `pending_confirmation` to `AppointmentStatus`, added `confirmedAt`/`expiresAt` fields to Appointment and AppointmentRow types.

**Hardcoded fixes:**
- `src/app/api/appointments/suggest-slots/route.ts` — Reads `buffer_minutes` from workspace DB (was hardcoded 15). Both slot routes now filter by `["scheduled", "pending_confirmation"]`.
- `src/app/api/client/appointments/slots/route.ts` — Status filter includes `pending_confirmation`.

**New booking flow:**
- `src/lib/db/appointments.ts` — Added `createPendingAppointment()` (24h expiry), `confirmAppointment()` (transitions to scheduled), `releaseExpiredPendingAppointments()`.
- `src/app/api/appointments/route.ts` — POST handles both regular and pending appointment creation with appropriate comms events.
- `src/app/api/client/appointments/route.ts` — Added PATCH handler for client confirm/decline.
- `src/app/app/appointments/_components/BookingSuggestionModal.tsx` — Creates pending appointments instead of immediately scheduled.
- `src/app/api/cron/release-pending/route.ts` — NEW: Vercel cron job for auto-releasing expired pending appointments.
- `vercel.json` — Added `*/15 * * * *` cron schedule.

**Calendar:**
- `src/app/app/appointments/_components/V7Calendar.tsx` — Full-block status colors (brass=pending, garnet=confirmed, blue=completed). Drag-and-drop reschedule via `react-dnd` with optimistic updates.
- `src/app/app/appointments/[id]/page.tsx` — Added `warning` badge variant for pending status.

---

## Area 4 — Inspo Photos: FIXED + UPGRADED

**Problem:** Unicode escapes rendering, no per-photo follow-up flow.

**What changed:**
- Fixed `\u2014` → `—` in 5 files:
  - `src/app/app/products/[id]/_components/InventoryPredictionCard.tsx`
  - `src/app/api/client/inspo/route.ts` (2 occurrences)
  - `src/app/api/client/inspo/[consultId]/route.ts`
  - `src/app/client/(portal)/inspo/_components/InspoUploader.tsx`
- `src/app/client/(portal)/inspo/_components/InspoUploader.tsx` — After upload, shows per-photo follow-up flow instead of immediately returning to list.
- `src/app/client/(portal)/inspo/_components/InspoFollowUp.tsx` — NEW: Per-photo question screen with AI-generated response options + free-text clarify + re-scan loop until no follow-ups remain.

---

## Area 5 — Aftercare: BUILT

**Problem:** Client portal showed "coming in Phase 4" stub. No practitioner editing.

**What changed:**
- `src/lib/db/aftercare.ts` — NEW: Query layer for `aftercare_plans` table (create, update, get by appointment, get by client).
- `src/app/api/aftercare/route.ts` — NEW: Practitioner POST endpoint.
- `src/app/api/aftercare/[id]/route.ts` — NEW: Practitioner PATCH endpoint.
- `src/app/api/client/aftercare/route.ts` — NEW: Client portal GET endpoint (published plans only).
- `src/app/app/appointments/[id]/_components/AftercareEditor.tsx` — NEW: Aftercare editor with save draft / publish / unpublish.
- `src/app/app/appointments/[id]/page.tsx` — Replaced "Service Log coming soon" with real AftercareEditor.
- `src/app/client/(portal)/aftercare/page.tsx` — Replaced stub with real aftercare feed.

---

## Area 6 — Per-Client Permissions: BUILT

**Problem:** No permission system existed. All clients could do everything.

**What changed:**
- `src/lib/types.ts` — Added `ClientPermissions` type, `DEFAULT_CLIENT_PERMISSIONS` (all OFF), added `permissions` to Client and ClientRow types.
- `src/app/api/clients/[id]/permissions/route.ts` — NEW: Practitioner PATCH endpoint for toggling permissions.
- `src/app/api/client/permissions/route.ts` — NEW: Client portal GET endpoint for checking own permissions.
- `src/app/app/clients/[id]/_components/PortalPermissions.tsx` — NEW: Toggle UI with optimistic updates.
- `src/app/app/clients/[id]/page.tsx` — Added PortalPermissions component to client profile.
- `src/app/client/(portal)/book/page.tsx` — Permission gate: shows "Your stylist manages this for you" when `can_self_book` is off.
- `src/app/client/(portal)/messages/page.tsx` — Permission gate for `can_message`.
- `src/app/client/(portal)/inspo/page.tsx` — Permission gate for `can_upload_inspo`.

---

## DB Migration Required

Run this SQL before deploying:

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS permissions JSONB
  DEFAULT '{"can_self_book": false, "can_message": false, "can_upload_inspo": false, "can_view_formulas": false}';
```

---

## Remaining Hardcoded Values (Acceptable)

| Location | Value | Reason Acceptable |
|----------|-------|-------------------|
| suggest-slots: DEFAULT_WORKING_HOURS | Mon-Fri 9-5 | Safe fallback when DB has no hours set |
| client slots: DEFAULT_HOURS | Mon-Sat 9-6 | Safe fallback, DB value used when available |
| V7Calendar: DEFAULT_WORKING | Mon-Sat 9-6 | Display fallback, prop from DB takes precedence |
| intelligence/starters: fallback prompts | Generic salon knowledge | Only shown when < 4 contextual prompts available |

---

## Build Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — no errors)
- Dev server runs without errors
- No console errors
- No failed network requests
