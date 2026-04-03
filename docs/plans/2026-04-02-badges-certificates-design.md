# Module 13: Badges & Certificates — Design Document

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Badge system with auto-award logic, certificate PDF generation, UI integration

## Goal

Complete Module 13 by adding badges (auto-awarded and instructor-awarded) and certificates (PDF generation for hour milestones) to the existing progress tracking infrastructure.

## Architecture

- 4 new database tables (badges, student_badges, certificates, student_certificates)
- Auto-award function hooked into clock-out and service completion flows
- Server-side PDF generation with jspdf, stored in Supabase Storage
- Badge display in StudentProfilePanel + student dashboard
- 5 API endpoints for badge/certificate CRUD

## Key Design Decisions

1. **Auto-award via single check function.** `checkAndAwardBadges(workspaceId, studentId)` runs after clock-out and service completion — checks all badge criteria in one pass.
2. **Server-side PDF with jspdf.** Lightweight, no headless browser needed. Generates PDF in API route, uploads to Supabase Storage.
3. **Criteria stored as JSONB.** Flexible — supports hours, service counts, category completion, and custom badges without schema changes.
4. **Badges are workspace-scoped.** Each school can customize their badge set. Default badges seeded on first use.

## Database Schema

### badges
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| name | varchar(100) | e.g. "100 Hour Club" |
| description | text | |
| image_url | text nullable | emoji/icon fallback |
| criteria_type | varchar(30) | hours_milestone, service_milestone, category_completion, custom |
| criteria_value | jsonb | e.g. {"hours": 1600}, {"count": 50}, {"category_code": "color"} |
| sort_order | int default 0 | |
| active | boolean default true | |
| created_at | timestamptz | |

### student_badges
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| student_id | uuid | |
| badge_id | uuid FK | |
| earned_at | timestamptz | |
| awarded_by | uuid nullable | null = auto, set = instructor |
| created_at | timestamptz | |

Unique: (workspace_id, student_id, badge_id)

### certificates
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| name | varchar(100) | e.g. "Cosmetology Completion" |
| template_html | text | HTML with {{placeholders}} |
| requirements | jsonb | e.g. {"hours": 1600} |
| active | boolean default true | |
| created_at | timestamptz | |

### student_certificates
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| student_id | uuid | |
| certificate_id | uuid FK | |
| issued_at | timestamptz | |
| certificate_url | text | Supabase Storage URL |
| created_at | timestamptz | |

Unique: (workspace_id, student_id, certificate_id)

### RLS
- All tables: workspace owner full CRUD
- student_badges, student_certificates: students can SELECT own rows

## Auto-Award Logic

Function: `checkAndAwardBadges(workspaceId, studentId)`

1. Fetch all active badges + student's already-earned badges
2. Fetch student data: hour_totals, curriculum_progress, service_completions count
3. For each unearned badge, evaluate criteria:
   - hours_milestone: hour_totals.total_hours >= criteria_value.hours
   - service_milestone: total service completions >= criteria_value.count
   - category_completion: curriculum_progress for category >= required_count
   - custom: skip (instructor-awarded only)
4. Batch insert any newly earned badges
5. If 1600-hour badge earned + certificate template exists → auto-generate certificate

Hook points (non-blocking):
- POST /api/floor/clock-out — after hour_totals update
- POST /api/services/complete — after curriculum_progress update

## Certificate Generation

- Dependency: jspdf
- Storage bucket: certificates
- Path: {workspace_id}/{student_id}/{certificate_id}.pdf
- Template placeholders: {{student_name}}, {{school_name}}, {{date}}, {{hours}}

## API Endpoints

| Method | Route | Permission |
|--------|-------|------------|
| GET | /api/badges | progress.view_all or progress.view_own |
| GET | /api/students/[id]/badges | progress.view_all or own |
| POST | /api/students/[id]/badges | progress.view_all |
| GET | /api/students/[id]/certificates | progress.view_all or own |
| POST | /api/certificates/generate | progress.view_all |

## UI Changes

1. StudentProfilePanel — new "Badges" section with earned badge grid
2. Student dashboard — badge showcase
3. Certificate download button when earned
4. Manual award button for instructors
