# Opelle Refinements Design — 2026-02-27

## Overview

Four targeted improvements to the Opelle app:
1. Contrast & color accessibility
2. Formulas tab → full history browser with content search
3. Tasks tab rename + new full audit History tab
4. Cursor ring lag fix

---

## 1. Contrast & Background Color

**Problem:** Background is too dark and warm (`--bark-mid: #474033`). Small text (faint labels) are too transparent to read comfortably.

**Changes:**
- `--bark-mid` → `#52504A` (lighter, cooler, less muddy)
- `--text-on-bark-faint` opacity: `0.52` → `0.65`
- Card label caps text (e.g. `PHONE`, `ADDED`) uses `--text-on-stone-dim` (#3D3832) — dark on stone, fully legible
- `--text-on-bark-ghost` opacity: `0.3` → `0.42`

---

## 2. Formulas Tab — History Browser

**Problem:** `/app/formulas` is currently the log formula input form. The Formulas nav tab should be a browsable history of all formulas.

**Changes:**

### Routing
- `/app/formulas` → formula history browser (new page)
- `/app/formulas/log` → log formula input form (current page, moved)
- Nav sidebar CTA "Log Formula" button → `/app/formulas/log`
- Formulas history page has its own "Log Formula" button in the header

### Formula History Browser (`/app/formulas`)
- Lists all formula entries across all clients, newest first
- Filter bar:
  - **Client** — dropdown (searchable)
  - **Service type** — dropdown
  - **Date range** — from/to date inputs
  - **Content search** — free text, searches `raw_notes` via `ilike` (catches "bleach", "level 6", "RR", "Shades EQ", "30vol", etc.)
- Results debounce 300ms on search input
- Each result card shows: client name, service type badge, date, formula preview with search term highlighted

### Backend
- New `listAllFormulaEntries(filters)` in `src/lib/db/formula-entries.ts`
  - Accepts: `clientId?`, `serviceTypeId?`, `dateFrom?`, `dateTo?`, `search?`
  - `search` uses `.ilike('raw_notes', '%term%')`
- Update `/api/formula-entries` GET to remove `clientId` required constraint, accept all filter params

---

## 3. Tasks Tab Rename + History Tab (Full Audit Log)

### Nav Changes
- `{ href: "/app/tasks", label: "History", icon: Clock }` → label: `"Tasks"`, icon: `CheckSquare`
- New nav item: `{ href: "/app/history", label: "History", icon: Clock }`
- Added to the "Practice" section in `NAV_SECTIONS`

### Database — `activity_log` table
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,           -- e.g. "formula.created", "client.updated"
  entity_type TEXT NOT NULL,      -- "formula" | "client" | "product" | "appointment" | "task"
  entity_id TEXT,                 -- ID of the affected record
  entity_label TEXT,              -- Human-readable name (e.g. "Sarah M.", "Full Color")
  diff JSONB,                     -- { before: {...}, after: {...} } for updates
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON activity_log(user_id, created_at DESC);
```

### Logging
Explicit log calls added in each API route handler (POST/PATCH/DELETE):
- `src/app/api/formula-entries/route.ts` — formula.created
- `src/app/api/clients/route.ts` + `[id]/route.ts` — client.created, client.updated, client.deleted
- `src/app/api/products/route.ts` + `[id]/route.ts` — product.created, product.updated, product.deleted
- `src/app/api/appointments/route.ts` + `[id]/route.ts` — appointment.created, appointment.updated, appointment.deleted
- `src/app/api/tasks/route.ts` + `[id]/route.ts` — task.created, task.updated, task.deleted

Helper: `src/lib/db/activity-log.ts` — `logActivity(action, entityType, entityId, entityLabel, diff?)`

### History Page (`/app/history`)
- Reverse-chronological activity feed
- Each item: icon (by entity_type) + action label + entity name + relative timestamp
  - e.g. `🧪 Formula logged for Sarah M. — Full Color — 2 min ago`
- Filter chips: All | Formulas | Clients | Products | Appointments | Tasks
- Shows last 200 events (no pagination initially)
- New `src/app/app/history/page.tsx`

---

## 4. Cursor Ring Lag

**Problem:** Both dot and ring snap instantly to cursor position — no satisfying lag effect.

**Fix:** Use `requestAnimationFrame` with lerp on the ring position only. Dot still snaps. Ring interpolates at 12% per frame toward the cursor.

```ts
// In BrassCursor.tsx
let ringX = -100, ringY = -100;
let cursorX = -100, cursorY = -100;

const animate = () => {
  ringX += (cursorX - ringX) * 0.12;
  ringY += (cursorY - ringY) * 0.12;
  ring.style.left = ringX + "px";
  ring.style.top = ringY + "px";
  rafId = requestAnimationFrame(animate);
};
```

Dot position set directly in `mousemove`. RAF loop runs continuously. Cleanup cancels the RAF on unmount.

---

## Implementation Order

1. CSS contrast fixes (globals.css) — quick win, no logic
2. Cursor ring lag (BrassCursor.tsx) — isolated component
3. Formulas tab restructure — move page, update API, build history browser
4. Activity log — Supabase migration, logging helper, API route updates, History page
