# Module 14: Universal Formula Translation Engine — Design Document

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Infrastructure only — owner-facing data capture, not client-facing translation

## Goal

Build the data infrastructure for formula translation: a universal color shade catalog, outcome tracking linked to existing formula_history records, and an owner-only dashboard for visibility into translation data quality.

## Architecture

**Approach:** Seed migration + auto-capture hook + read-heavy dashboard.

- 6 new database tables (2 global catalog, 4 workspace-scoped)
- Seed data for 8 major color lines with ~100 shades
- Hook into existing service completion flow for auto-capture
- Owner-only dashboard at `/app/translations` (hidden from nav)
- 7 API endpoints under `/api/translations/`

## Key Design Decisions

1. **Separate catalog from inventory.** `color_shades` is a universal reference database (shades from brands you don't stock). `products` is what's actually in inventory. Different purposes.
2. **Reference formula_history, don't duplicate.** `translation_outcomes` links to `formula_history` via FK — photos, formula, and client data live there.
3. **Seed via migration.** 8 brands x ~12 shades each gives immediate value. Owner can add more via API.
4. **Auto-capture is lightweight.** One additional INSERT during service completion — fire and forget, no blocking.

## Database Schema

### Global Tables (no workspace_id)

**`color_lines`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| brand | varchar | e.g. "Redken" |
| line_name | varchar | e.g. "Shades EQ" |
| type | varchar | permanent/demi-permanent/semi-permanent |
| characteristics | jsonb | lift capability, gray coverage %, processing time range |
| created_at | timestamptz | |

**`color_shades`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| color_line_id | uuid FK → color_lines | |
| shade_code | varchar | e.g. "6N" |
| shade_name | varchar | e.g. "Dark Blonde Natural" |
| level | smallint | 1-10 |
| primary_tone | varchar | N, A, G, R, V, B, etc. |
| secondary_tone | varchar nullable | |
| created_at | timestamptz | |

Unique: `(color_line_id, shade_code)`

### Workspace-Scoped Tables

**`universal_color_profiles`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK → workspaces | |
| target_level | smallint | 1-10 |
| primary_tone | varchar | |
| secondary_tone | varchar nullable | |
| tone_intensity | varchar | light/medium/full |
| gray_coverage | varchar | none/blend/full |
| technique | varchar | single-process/double-process/gloss/toner |
| created_at | timestamptz | |

**`formula_translations`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK → workspaces | |
| universal_profile_id | uuid FK → universal_color_profiles | |
| color_line_id | uuid FK → color_lines | |
| formula | jsonb | shades, ratios, developer, processing |
| usage_count | int default 0 | |
| success_rate | numeric nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`translation_outcomes`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK → workspaces | |
| formula_translation_id | uuid FK nullable → formula_translations | |
| formula_history_id | uuid FK → formula_history | |
| client_id | uuid FK → clients | |
| outcome_success | boolean nullable | null = pending |
| stylist_feedback | text | |
| adjustment_notes | text | |
| created_at | timestamptz | |

**`shade_mappings`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| source_shade_id | uuid FK → color_shades | |
| target_shade_id | uuid FK → color_shades | |
| mapping_confidence | numeric(3,2) | 0.00-1.00 |
| outcome_count | int default 0 | |
| adjustment_notes | text | |
| created_at | timestamptz | |

Unique: `(source_shade_id, target_shade_id)`

### RLS Policies

- `color_lines`, `color_shades`: SELECT for all authenticated users (global catalog)
- `universal_color_profiles`, `formula_translations`, `translation_outcomes`: full CRUD for workspace owner
- `shade_mappings`: SELECT for all authenticated, INSERT/UPDATE for workspace owner

## API Endpoints

All owner-only via `hasPermission(role, "translations.manage", overrides)`.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/translations/stats | Dashboard KPIs |
| GET | /api/translations/color-lines | Catalog browser (with shade counts) |
| POST | /api/translations/color-lines | Add color line |
| POST | /api/translations/shades | Batch add shades to a line |
| GET | /api/translations/outcomes | Recent outcomes feed (paginated) |
| POST | /api/translations/outcomes | Manual translation logging |
| GET | /api/translations/data-quality | Data completeness metrics |

## Dashboard UI

**Route:** `/app/translations` — owner-only, hidden from nav.

**Sections:**
1. **Stats bar** — 4 KPI cards: Total Formulas, Total Outcomes, With Photos, With Feedback
2. **Color Line Catalog** — Expandable brand → line → shades browser. "Add Color Line" button.
3. **Outcome Feed** — Recent outcomes with before/after thumbnails, client name, formula summary, success badge
4. **Manual Translation Log** — Form: client, source formula, target formula, outcome, feedback
5. **Data Quality** — Progress bars for completeness metrics

## Auto-Capture Integration

Hook into `POST /api/services/complete` — after `formula_history` record is created:
- If service has `formulaData` + `clientId` + photos → insert `translation_outcomes` row
- Set `formula_history_id`, `client_id`, leave `outcome_success` null (pending)
- Lightweight, non-blocking

## Seed Data

9 color lines, ~110 shades total:
- Redken Shades EQ, Redken Color Gels Lacquers
- L'Oreal Majirel, L'Oreal Dia Light
- Wella Koleston Perfect, Wella Color Touch
- Schwarzkopf Igora Royal
- Goldwell Topchic
- R+Co

Levels 1-10, common tones: N, A, G, R, V, B.

## Permission

New permission: `translations.manage` — granted to `owner` role only.
