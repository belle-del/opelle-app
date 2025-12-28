-- Create tables for student data and enable RLS.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references auth.users(id),
  first_name text not null,
  last_name text,
  pronouns text,
  phone text,
  email text,
  notes text,
  invite_token text unique,
  invite_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references auth.users(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_name text not null,
  start_at timestamptz not null,
  duration_min int not null default 60,
  status text not null check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.formulas (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references auth.users(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  service_type text not null check (service_type in ('color', 'lighten', 'tone', 'gloss', 'other')),
  title text not null,
  color_line text,
  notes text,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.formulas enable row level security;

create policy "clients_select_own"
  on public.clients
  for select
  using (stylist_id = auth.uid());

create policy "clients_insert_own"
  on public.clients
  for insert
  with check (stylist_id = auth.uid());

create policy "clients_update_own"
  on public.clients
  for update
  using (stylist_id = auth.uid())
  with check (stylist_id = auth.uid());

create policy "clients_delete_own"
  on public.clients
  for delete
  using (stylist_id = auth.uid());

create policy "appointments_select_own"
  on public.appointments
  for select
  using (stylist_id = auth.uid());

create policy "appointments_insert_own"
  on public.appointments
  for insert
  with check (stylist_id = auth.uid());

create policy "appointments_update_own"
  on public.appointments
  for update
  using (stylist_id = auth.uid())
  with check (stylist_id = auth.uid());

create policy "appointments_delete_own"
  on public.appointments
  for delete
  using (stylist_id = auth.uid());

create policy "formulas_select_own"
  on public.formulas
  for select
  using (stylist_id = auth.uid());

create policy "formulas_insert_own"
  on public.formulas
  for insert
  with check (stylist_id = auth.uid());

create policy "formulas_update_own"
  on public.formulas
  for update
  using (stylist_id = auth.uid())
  with check (stylist_id = auth.uid());

create policy "formulas_delete_own"
  on public.formulas
  for delete
  using (stylist_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists formulas_set_updated_at on public.formulas;
create trigger formulas_set_updated_at
  before update on public.formulas
  for each row execute function public.set_updated_at();

create index if not exists clients_stylist_id_idx on public.clients (stylist_id);
create index if not exists appointments_stylist_id_start_at_idx on public.appointments (stylist_id, start_at);
create index if not exists formulas_stylist_id_updated_at_idx on public.formulas (stylist_id, updated_at);
