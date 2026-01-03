# Opelle DB Audit (Current App Expectations)

Last updated: 2025-01-01

## Scope

This document summarizes what the current Opelle UI and API code expects
from the database and Supabase Auth configuration. It is derived from the
code under `src/` and the existing migration in
`supabase/migrations/001_init_student_data.sql`.

## Data Sources in the App

- Supabase tables: `clients`, `appointments`, `formulas`
- Supabase Auth user metadata: `invite_token` (client claim flow)
- Local-only (not in DB yet):
  - Client intake form: `opelle:client:v1:intake`
  - Client rebook request: `opelle:client:v1:rebookRequest`
  - Aftercare draft: `opelle:v1:aftercareDraft:<clientId>`
  - Backup export/import: `OpelleBackupV1` bundle of local data

## Required Tables and Columns

### clients

Used by:
- Student clients list/detail/edit
- Appointments and formulas lookups by `client_id`
- Invite token generation and client portal packet lookup

Expected columns:
- `id uuid primary key`
- `stylist_id uuid not null references auth.users(id)`
- `first_name text not null`
- `last_name text`
- `pronouns text`
- `phone text`
- `email text`
- `notes text`
- `invite_token text unique`
- `invite_updated_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### appointments

Used by:
- Student appointment list/detail/edit
- Client detail "Upcoming appointments"
- Client packet: next scheduled appointment

Expected columns:
- `id uuid primary key`
- `stylist_id uuid not null references auth.users(id)`
- `client_id uuid not null references clients(id) on delete cascade`
- `service_name text not null`
- `start_at timestamptz not null`
- `duration_min int not null default 60`
- `status text not null check in ('scheduled','completed','cancelled')`
- `notes text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### formulas

Used by:
- Student formula list/detail/edit
- Client detail "Recent formulas"
- Client packet: last formula summary

Expected columns:
- `id uuid primary key`
- `stylist_id uuid not null references auth.users(id)`
- `client_id uuid not null references clients(id) on delete cascade`
- `appointment_id uuid references appointments(id) on delete set null`
- `service_type text not null check in ('color','lighten','tone','gloss','other')`
- `title text not null`
- `color_line text`
- `notes text`
- `steps jsonb not null default '[]'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## RLS Expectations

RLS is enabled on all three tables. Policies must enforce:
- `stylist_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE

This is required for:
- Student console data isolation per stylist
- API routes under `src/app/api/db/*`

## Auth and Session Expectations

### Student Auth

- Login: Google OAuth via `/login`
- Callback: `/auth/callback`
- Protected routes: `/app/*` via `src/proxy.ts`

### Client Auth

- Claim flow attaches invite token to user metadata:
  - `user.user_metadata.invite_token`
- Client portal requires user logged in and token present
- Protected routes: `/client/*` via `src/proxy.ts`

### Service Role Access

Used in:
- `/api/client/packet` to look up client by `invite_token`
- `/api/client/claim-invite` fallback to update user metadata if regular update fails

Env required:
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## API Expectations (DB-backed)

### Student API

- `GET /api/db/clients`
- `POST /api/db/clients`
- `GET /api/db/clients/:id`
- `PATCH /api/db/clients/:id`
- `DELETE /api/db/clients/:id`
- `POST /api/db/clients/:id/invite`

- `GET /api/db/appointments`
- `POST /api/db/appointments`
- `GET /api/db/appointments/:id`
- `PATCH /api/db/appointments/:id`
- `DELETE /api/db/appointments/:id`

- `GET /api/db/formulas`
- `POST /api/db/formulas`
- `GET /api/db/formulas/:id`
- `PATCH /api/db/formulas/:id`
- `DELETE /api/db/formulas/:id`

### Client Packet API

- `GET /api/client/packet?token=...`
- If logged in, prefers `user_metadata.invite_token`
- Reads:
  - `clients` by `invite_token`
  - next `appointments` by `client_id` and `status='scheduled'`
  - latest `formulas` by `client_id`

## Indexes Required

From migration:
- `clients(stylist_id)`
- `appointments(stylist_id, start_at)`
- `formulas(stylist_id, updated_at)`

Operationally useful:
- `clients(invite_token)` (already unique, uses implicit index)
- `appointments(client_id, start_at)` for client-specific queries
- `formulas(client_id, updated_at)` for client-specific recent items

## Gaps / Future Tables (Not in DB Yet)

These are local-only in the current app. If moving to DB later, new tables
will be required:
- Client intake form
- Client rebook requests
- Aftercare drafts/history
- Client portal profile (if not using auth user metadata)

## Checklist

- [ ] Tables exist with columns above
- [ ] RLS enabled and policies enforce stylist ownership
- [ ] Service role key is set for server-only packet lookup
- [ ] OAuth callback configured in Supabase Auth
