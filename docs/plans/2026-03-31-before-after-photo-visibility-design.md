# Before/After Photo Visibility — Design Doc
Date: 2026-03-31
Build Bible: Rule 9 (Step 4), Module 8.3, Module 8.5

## Problem
Photos are now captured and stored on `service_completions` (before_photo_url, after_photo_url)
and `formula_history`. But they're invisible — nothing in the UI surfaces them to stylists
or clients beyond the client portal history thumbnails shipped in the same session.

This builds three surfaces that make photos visible and useful.

## Approach — Option A: Surface-specific queries, formula_history as photo record
Each surface queries the right table directly. No new FK between formula_entries and
formula_history. One small migration (portfolio_public flag). Reusable components shared
across surfaces.

---

## Surface 1: Client Visual History (Practitioner View)

### Where
New "Photos" tab inside existing `ClientDetailTabs` on `/app/clients/[id]`.
Tab order: Formulas | **Photos** | History | Inspo | Messages

### Data source
`service_completions` WHERE client_id matches AND at least one photo URL is non-null.
Joined to `service_categories` for category name and `student_name` from the completion record.

### API
`GET /api/clients/[id]/photos`
- Auth: stylist session (server client → admin with workspace_id guard)
- Query:
```sql
SELECT sc.id, sc.before_photo_url, sc.after_photo_url,
       sc.completed_at, sc.student_name,
       cat.name AS category_name, sc.notes
FROM   service_completions sc
JOIN   service_categories cat ON cat.id = sc.category_id
WHERE  sc.workspace_id = $workspaceId
AND    sc.client_id    = $clientId
AND    (sc.before_photo_url IS NOT NULL OR sc.after_photo_url IS NOT NULL)
ORDER  BY sc.completed_at DESC
```
- Response: `{ pairs: PhotoPair[] }`

### UI
`BeforeAfterGallery` component — responsive 2-col grid of `PhotoPairCard` items.
Each card: after photo primary (full card, 4:3), before photo as small bottom-left overlay (25% width).
Service type badge + date below.

Click → `BeforeAfterModal`:
- Full-size side-by-side before/after
- Service name, date, stylist name
- "View formula →" link if formula_history.service_completion_id matches

Empty state: "No photos yet — photos from color and chemical services appear here after completion."

---

## Surface 2: Formula Photos

### Formula list (`/app/formulas`)
Each formula entry card gains a small after-photo thumbnail (48×48px, rounded) on the
right side. Fetched via loose join: formula_entry.client_id + service_date ±1 day
against formula_history. If multiple matches, pick closest date. No thumbnail if no match.

### Formula detail (new: `/app/formulas/[id]`)
New page — clicking a formula entry card navigates here.
Content:
- Existing card content (client name, service type, date, raw notes, parsed formula)
- "Visual Result" section at bottom:
  - If linked formula_history exists with photos: side-by-side before/after, result_notes,
    client_satisfaction (1-5 stars)
  - If no match: "No photo on file for this formula."

### API
`GET /api/formula-entries/[id]/photos`
- Auth: stylist session
- Joins formula_entry → formula_history via client_id + service_date proximity
- Returns: `{ before_photo_url, after_photo_url, result_notes, client_satisfaction, completed_at, category_name } | null`

---

## Surface 3: Portfolio Page

### Internal page: `/app/portfolio`
Accessible from stylist nav. Shows ALL service_completions for the authenticated user
(student_id = user.id) where photos exist.

Filter bar: All | Color | Highlights | Cuts | Perm | Other (maps to service_category.code)

Grid: `BeforeAfterGallery` with same `PhotoPairCard` component.

Settings card at top:
- "Make portfolio public" toggle
- When on: shows shareable URL `opelle.app/stylist/[userId]/work` + copy button
- Calls `PATCH /api/settings/portfolio` → sets workspace.portfolio_public = true/false

### Public page: `/stylist/[userId]/work`
No auth required. Returns 404 if workspace.portfolio_public = false.
Same grid, no client names/notes exposed. Header: stylist name + workspace name.
"Book an appointment →" CTA if workspace has booking enabled.

### API
`GET /api/portfolio/[userId]`
- Dual-mode: authenticated OR public (checks workspace.portfolio_public)
- Returns 404 if not public and no valid session
- Query: service_completions WHERE student_id = userId AND workspace_id = workspaceId
  AND photos exist, joined to service_categories
- Response: `{ pairs: PhotoPair[], stylistName: string, portfolioPublic: boolean }`

### Migration
```sql
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT false;
```

---

## Reusable Components

| Component | Path | Props | Used by |
|-----------|------|-------|---------|
| `BeforeAfterGallery` | `src/components/BeforeAfterGallery.tsx` | `pairs: PhotoPair[], emptyMessage?: string` | Client Photos tab, Portfolio |
| `BeforeAfterModal` | `src/components/BeforeAfterModal.tsx` | `pair: PhotoPair, onClose: () => void` | Client Photos tab, Portfolio |
| `PhotoPairCard` | `src/components/PhotoPairCard.tsx` | `pair: PhotoPair, onClick: () => void` | Inside Gallery |
| `FormulaAfterThumb` | inline in formula list card | `url: string` | Formulas list |

### PhotoPair type (add to types.ts)
```ts
export type PhotoPair = {
  id: string;                    // service_completion id
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  completedAt: string;
  categoryName: string;
  studentName?: string;          // omitted on public portfolio
  notes?: string;
};
```

---

## New API endpoints summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/clients/[id]/photos` | stylist | Client visual history |
| GET | `/api/formula-entries/[id]/photos` | stylist | Formula outcome photos |
| GET | `/api/portfolio/[userId]` | optional | Portfolio (public or internal) |
| PATCH | `/api/settings/portfolio` | stylist | Toggle portfolio_public |

---

## What is NOT changing
- `BeforeAfterCapture.tsx` — untouched
- `formula_entries` schema — no new FK added
- `/api/photos/upload` — untouched
- `/api/services/complete` — untouched
- Client portal history page — already ships before/after thumbnails
