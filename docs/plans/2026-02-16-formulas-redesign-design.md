# Formulas Redesign — Smart Notepad

## Summary

Replace the current structured formula builder with a freeform notepad. You pick a client, pick a service type, write naturally what you mixed, and Claude AI parses it into clean formatted bowls. Raw notes and AI-formatted version both stored. Formulas live on client profiles, not a separate page.

## Data Model

### New table: `formula_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | Required |
| client_id | UUID FK | Required, not nullable |
| service_type_id | UUID FK | Links to service_types |
| raw_notes | TEXT | Exactly what was typed |
| parsed_formula | JSONB | AI-structured version, nullable until parsed |
| general_notes | TEXT | Client preferences, next-visit plans |
| service_date | DATE | When the service was done, defaults today |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### New table: `service_types`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | Required |
| name | TEXT | e.g. "Base Color" |
| sort_order | INT | Display ordering |
| created_at | TIMESTAMPTZ | |

Default seeds: Base Color, All Over Color, Gloss, Partial Highlight, Full Highlight, Partial Balayage, Full Balayage, Mini Highlight.

### parsed_formula JSONB shape

```json
{
  "bowls": [
    {
      "label": "Bowl 1 — Roots to Midshaft",
      "products": [
        { "name": "8.6N", "amount": "2 oz", "brand": "Shades EQ" },
        { "name": "7.6N", "amount": "2 oz", "brand": "Shades EQ" }
      ],
      "developer": { "volume": "10vol", "amount": "4 oz" },
      "processingTime": "35 min",
      "applicationNotes": "Applied starting at regrowth line, pulled through to mid"
    }
  ]
}
```

## Navigation

- Sidebar "Formulas" becomes "Log Formula" — links directly to the notepad input page
- Formula history only accessible from client profile pages
- Old formula list/detail/edit pages removed

## Pages

### `/app/formulas` (rewritten) — Log Formula Notepad
1. Client picker (searchable, required)
2. Service type dropdown (from service_types table, + "Add new" option)
3. Date picker (defaults today)
4. Big textarea for formula notes
5. Smaller textarea for general notes
6. Save button → stores raw_notes, triggers AI parse in background

### Client profile `/app/clients/[id]` — Formula History section
- Accordion grouped by service type
- Each service type section shows entries newest-first
- Each entry shows AI-formatted bowls (products, amounts, developer, time)
- "View raw notes" toggle per entry
- General notes shown with orange styling
- Edit button per entry
- "Add Formula" button pre-selects client

### Settings — Service Types management
- List service types with drag-to-reorder
- Add new, rename, delete

## AI Integration

- New API route: `POST /api/formulas/parse`
- Accepts `{ rawNotes: string }`
- Calls Anthropic Claude API with a system prompt that parses hair color notes into the JSONB bowl structure
- Returns parsed JSON
- Called after save; if it fails, entry saved with parsed_formula = null, can retry later
- Requires `ANTHROPIC_API_KEY` env var and `@anthropic-ai/sdk` package

## What Gets Removed

- `/app/formulas/page.tsx` (list view)
- `/app/formulas/[id]/page.tsx` (detail view)
- `/app/formulas/[id]/edit/page.tsx` (edit form)
- `/app/formulas/[id]/_components/FormulaActions.tsx`
- Old FormulaStep structured step builder from new/edit pages
- ProductSearch integration in formula forms (stays for Products pages)
- Old `FormulaServiceType` union type (replaced by DB-driven service_types)

## What Stays

- Products table and pages (inventory, separate concern)
- Old `formulas` DB table (left in place, unused)
- BarcodeScanner and ProductSearch components (used by Products feature)
