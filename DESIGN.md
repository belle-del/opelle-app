# Opelle v2 Design Structure

## Decisions Locked

- **Multi-tenancy**: Workspace-based (fresh schema)
- **Client access**: Invite-only portal
- **Auth**: Google OAuth via Supabase Auth
- **Stack**: Next.js 16 + Tailwind 4 + Supabase + Vercel

---

## 1. Launch Sequence

### Launch 1: Student Console
The stylist's daily driver. Log clients, appointments, service notes, formulas, photos.

### Launch 2: Client Portal (fast follow)
Invite-only. Clients complete intake, view aftercare, request rebooking.

---

## 2. Route Map

### Public
```
/                       Landing page
/login                  Google OAuth login
```

### Student Console (protected: authenticated stylist)
```
/app                    Dashboard (today's appointments, next actions)
/app/clients            Client list + search
/app/clients/new        Create client
/app/clients/[id]       Client detail (history, photos, notes)
/app/clients/[id]/edit  Edit client
/app/appointments       Appointment list
/app/appointments/new   Create appointment
/app/appointments/[id]  Appointment detail + service log
/app/formulas           Formula library
/app/formulas/new       Create formula
/app/formulas/[id]      Formula detail
/app/education          Education tasks
/app/settings           Profile, preferences, export
```

### Client Portal (protected: authenticated client via invite)
```
/client                 Client home (status cards)
/client/invite/[token]  Claim invite, create account
/client/intake          Complete intake form
/client/aftercare       View published aftercare
/client/rebook          Request rebooking
/client/profile         Update contact info, consent
```

---

## 3. Database Schema (Supabase/Postgres)

### Core Tables

```sql
-- Workspace: one per stylist (multi-tenant ready)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients: belong to a workspace
create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  first_name text not null,
  last_name text,
  pronouns text,
  phone text,
  email text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services: templates for appointment types
create table services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  duration_mins int default 60,
  default_template jsonb default '{}',
  created_at timestamptz default now()
);

-- Appointments: scheduled services
create table appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  service_name text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  duration_mins int not null default 60,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Service Logs: one per appointment (the core work record)
create table service_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  consult_notes text,
  aftercare_notes text,
  learning_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Formulas: color/chemical formulas
create table formulas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  service_type text not null check (service_type in ('color', 'lighten', 'tone', 'gloss', 'other')),
  title text not null,
  color_line text,
  steps jsonb not null default '[]',
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Photos: before/after images
create table photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  url text not null,
  caption text,
  photo_type text check (photo_type in ('before', 'after', 'progress', 'other')),
  created_at timestamptz default now()
);

-- Tasks: education/practice tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Client Portal Tables

```sql
-- Client Invites: stylist sends invite link
create table client_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Client Users: clients who have claimed an invite
create table client_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, workspace_id)
);

-- Intake Responses: client-submitted intake forms
create table intake_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  answers jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Consent: photo/chemical consent records
create table consents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  photo_consent boolean default false,
  chemical_consent boolean default false,
  signature_name text,
  created_at timestamptz default now()
);

-- Rebook Requests: client requests new appointment
create table rebook_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  preferred_dates jsonb default '[]',
  service_type text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz default now()
);

-- Aftercare Plans: stylist-published aftercare visible to client
create table aftercare_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  client_visible_notes text,
  recommended_products jsonb default '[]',
  published_at timestamptz default now()
);
```

### RLS Policies (Row Level Security)

```sql
-- Enable RLS on all tables
alter table workspaces enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table service_logs enable row level security;
alter table formulas enable row level security;
alter table photos enable row level security;
alter table tasks enable row level security;
alter table client_invites enable row level security;
alter table client_users enable row level security;
alter table intake_responses enable row level security;
alter table consents enable row level security;
alter table rebook_requests enable row level security;
alter table aftercare_plans enable row level security;

-- Stylist policies: owner can do everything in their workspace
-- (Example for clients table - repeat pattern for all workspace-scoped tables)

create policy "workspace_owner_select" on clients
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "workspace_owner_insert" on clients
  for insert with check (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "workspace_owner_update" on clients
  for update using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "workspace_owner_delete" on clients
  for delete using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Client policies: can only see their own data
create policy "client_user_select_own" on intake_responses
  for select using (
    client_id in (select client_id from client_users where user_id = auth.uid())
  );

create policy "client_user_select_aftercare" on aftercare_plans
  for select using (
    client_id in (select client_id from client_users where user_id = auth.uid())
  );
```

### Indexes

```sql
create index clients_workspace_id_idx on clients(workspace_id);
create index appointments_workspace_id_start_at_idx on appointments(workspace_id, start_at);
create index formulas_workspace_id_idx on formulas(workspace_id);
create index photos_client_id_idx on photos(client_id);
create index client_invites_token_idx on client_invites(token);
create index client_users_user_id_idx on client_users(user_id);
```

### Triggers

```sql
-- Auto-update updated_at timestamp
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger set_updated_at before update on workspaces
  for each row execute function set_updated_at();
create trigger set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger set_updated_at before update on appointments
  for each row execute function set_updated_at();
create trigger set_updated_at before update on service_logs
  for each row execute function set_updated_at();
create trigger set_updated_at before update on formulas
  for each row execute function set_updated_at();
create trigger set_updated_at before update on tasks
  for each row execute function set_updated_at();
```

---

## 4. Auth Flow

### Stylist (Google OAuth)
1. User clicks "Sign in with Google" on `/login`
2. Supabase Auth handles OAuth flow
3. On first login, create Workspace for user (trigger or app code)
4. Redirect to `/app`

### Client (Invite → Google OAuth)
1. Stylist creates invite from client detail page
2. Client receives link: `/client/invite/[token]`
3. App validates token (not expired, not used)
4. Client clicks "Sign in with Google"
5. On auth callback, link `auth.users` to `client_users` record
6. Mark invite as used
7. Redirect to `/client`

---

## 5. Project Structure

```
/src
  /app
    /(auth)
      /login/page.tsx
      /auth/callback/route.ts
    /app                          # Student console
      /layout.tsx                 # Sidebar + header
      /page.tsx                   # Dashboard
      /clients/...
      /appointments/...
      /formulas/...
      /education/...
      /settings/...
    /client                       # Client portal
      /layout.tsx                 # Mobile-first layout
      /page.tsx                   # Client home
      /invite/[token]/page.tsx
      /intake/...
      /aftercare/...
      /rebook/...
      /profile/...
    /api
      /...                        # API routes if needed
  /components
    /ui                           # Base UI components (shadcn-style)
    /app                          # Student console components
    /client                       # Client portal components
  /lib
    /supabase
      /client.ts                  # Browser client
      /server.ts                  # Server client
      /admin.ts                   # Service role client
      /middleware.ts              # Auth middleware helper
    /db                           # Database query functions
      /workspaces.ts
      /clients.ts
      /appointments.ts
      /service-logs.ts
      /formulas.ts
      /photos.ts
      /tasks.ts
      /invites.ts
    /types.ts                     # TypeScript types
    /utils.ts                     # Helpers
  /middleware.ts                  # Next.js middleware (route protection)
```

---

## 6. Step-by-Step Build Order

### Phase 0: Foundation
- [ ] 0.1 Initialize Next.js app with existing config
- [ ] 0.2 Set up Tailwind + base styles
- [ ] 0.3 Create `/src` folder structure
- [ ] 0.4 Add `.env.local` with Supabase keys
- [ ] 0.5 Set up Supabase client helpers (browser, server, admin)

### Phase 1: Database
- [ ] 1.1 Drop existing tables in Supabase (clients, appointments, formulas)
- [ ] 1.2 Run new schema migration (all tables)
- [ ] 1.3 Run RLS policies migration
- [ ] 1.4 Run indexes + triggers migration
- [ ] 1.5 Verify in Supabase dashboard

### Phase 2: Auth
- [ ] 2.1 Enable Google OAuth in Supabase dashboard
- [ ] 2.2 Create `/login` page with Google sign-in button
- [ ] 2.3 Create `/auth/callback` route handler
- [ ] 2.4 Create middleware to protect `/app/*` routes
- [ ] 2.5 Auto-create workspace on first stylist login
- [ ] 2.6 Test: sign in, workspace created, redirect to /app

### Phase 3: Student Console - Layouts
- [ ] 3.1 Create `/app/layout.tsx` with sidebar navigation
- [ ] 3.2 Create base UI components (Button, Card, Input, etc.)
- [ ] 3.3 Create `/app/page.tsx` dashboard shell

### Phase 4: Clients Module
- [ ] 4.1 Create `lib/db/clients.ts` with CRUD functions
- [ ] 4.2 Create `/app/clients/page.tsx` - list view
- [ ] 4.3 Create `/app/clients/new/page.tsx` - create form
- [ ] 4.4 Create `/app/clients/[id]/page.tsx` - detail view
- [ ] 4.5 Create `/app/clients/[id]/edit/page.tsx` - edit form
- [ ] 4.6 Test: create, view, edit, delete client

### Phase 5: Appointments Module
- [ ] 5.1 Create `lib/db/appointments.ts` with CRUD functions
- [ ] 5.2 Create `/app/appointments/page.tsx` - list view
- [ ] 5.3 Create `/app/appointments/new/page.tsx` - create form
- [ ] 5.4 Create `/app/appointments/[id]/page.tsx` - detail + service log
- [ ] 5.5 Create `lib/db/service-logs.ts`
- [ ] 5.6 Test: create appointment, add service log

### Phase 6: Formulas Module
- [ ] 6.1 Create `lib/db/formulas.ts` with CRUD functions
- [ ] 6.2 Create `/app/formulas/page.tsx` - list view
- [ ] 6.3 Create `/app/formulas/new/page.tsx` - create form
- [ ] 6.4 Create `/app/formulas/[id]/page.tsx` - detail view
- [ ] 6.5 Test: create formula, link to client/appointment

### Phase 7: Dashboard + Education
- [ ] 7.1 Build dashboard with upcoming appointments
- [ ] 7.2 Add "next actions" section (incomplete logs, etc.)
- [ ] 7.3 Create `/app/education/page.tsx` - tasks list
- [ ] 7.4 Create `lib/db/tasks.ts`

### Phase 8: Photos (can be stubbed)
- [ ] 8.1 Set up Supabase Storage bucket for photos
- [ ] 8.2 Create photo upload component
- [ ] 8.3 Create `lib/db/photos.ts`
- [ ] 8.4 Add photo gallery to client detail page

### Phase 9: Client Portal - Invite Flow
- [ ] 9.1 Create `lib/db/invites.ts`
- [ ] 9.2 Add "Create Invite" button to client detail
- [ ] 9.3 Create `/client/invite/[token]/page.tsx`
- [ ] 9.4 Handle invite claim + Google OAuth
- [ ] 9.5 Create `client_users` record on successful claim

### Phase 10: Client Portal - Features
- [ ] 10.1 Create `/client/layout.tsx` (mobile-first)
- [ ] 10.2 Create `/client/page.tsx` - home with status cards
- [ ] 10.3 Create `/client/intake/page.tsx` - intake form
- [ ] 10.4 Create `/client/aftercare/page.tsx` - view aftercare
- [ ] 10.5 Create `/client/rebook/page.tsx` - request form
- [ ] 10.6 Create `/client/profile/page.tsx` - edit profile

### Phase 11: Polish
- [ ] 11.1 Loading states + skeletons
- [ ] 11.2 Error handling + toasts
- [ ] 11.3 Empty states
- [ ] 11.4 Mobile responsiveness pass
- [ ] 11.5 Settings page

### Phase 12: Deploy
- [ ] 12.1 Create Vercel project
- [ ] 12.2 Add environment variables
- [ ] 12.3 Deploy and test
- [ ] 12.4 Set up custom domain (optional)

---

## 7. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qccrfgkfcdcezxzdtfpk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. Key TypeScript Types

```typescript
// Workspace
type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Client
type Client = {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName?: string;
  pronouns?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// Appointment
type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

type Appointment = {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceId?: string;
  serviceName: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Service Log
type ServiceLog = {
  id: string;
  workspaceId: string;
  appointmentId: string;
  consultNotes?: string;
  aftercareNotes?: string;
  learningNotes?: string;
  createdAt: string;
  updatedAt: string;
};

// Formula
type FormulaServiceType = 'color' | 'lighten' | 'tone' | 'gloss' | 'other';

type FormulaStep = {
  stepName: string;
  product: string;
  developer?: string;
  ratio?: string;
  grams?: number;
  processingMins?: number;
  notes?: string;
};

type Formula = {
  id: string;
  workspaceId: string;
  clientId?: string;
  appointmentId?: string;
  serviceType: FormulaServiceType;
  title: string;
  colorLine?: string;
  steps: FormulaStep[];
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// Photo
type PhotoType = 'before' | 'after' | 'progress' | 'other';

type Photo = {
  id: string;
  workspaceId: string;
  clientId?: string;
  appointmentId?: string;
  url: string;
  caption?: string;
  photoType?: PhotoType;
  createdAt: string;
};

// Task
type TaskStatus = 'pending' | 'in_progress' | 'completed';

type Task = {
  id: string;
  workspaceId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};

// Client Portal types
type ClientInvite = {
  id: string;
  workspaceId: string;
  clientId: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

type ClientUser = {
  id: string;
  userId: string;
  workspaceId: string;
  clientId: string;
  createdAt: string;
};

type IntakeResponse = {
  id: string;
  workspaceId: string;
  clientId: string;
  appointmentId?: string;
  answers: Record<string, unknown>;
  createdAt: string;
};

type Consent = {
  id: string;
  workspaceId: string;
  clientId: string;
  photoConsent: boolean;
  chemicalConsent: boolean;
  signatureName?: string;
  createdAt: string;
};

type RebookRequestStatus = 'pending' | 'confirmed' | 'declined';

type RebookRequest = {
  id: string;
  workspaceId: string;
  clientId: string;
  preferredDates: string[];
  serviceType?: string;
  notes?: string;
  status: RebookRequestStatus;
  createdAt: string;
};

type AftercarePlan = {
  id: string;
  workspaceId: string;
  appointmentId: string;
  clientId: string;
  clientVisibleNotes?: string;
  recommendedProducts: string[];
  publishedAt: string;
};
```

---

## 9. Open Questions (to decide during build)

1. **Workspace auto-creation**: Trigger in DB or handle in app code on first login?
2. **Photo storage**: Supabase Storage or defer to later phase?
3. **Service templates**: Build in Phase 1 or add later?
4. **Offline support**: Needed for v1 or defer to native iOS?

---

**Document version:** v2.0
**Date:** 2026-01-20
