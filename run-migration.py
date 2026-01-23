#!/usr/bin/env python3
"""
Run database migration against Supabase using the connection string.
"""
import urllib.request
import json
import ssl

SUPABASE_URL = "https://qccrfgkfcdcezxzdtfpk.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3JmZ2tmY2RjZXp4emR0ZnBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQzMjk0MSwiZXhwIjoyMDgyMDA4OTQxfQ.S2_C8tlAc0JVkAYt5UVXupFWq7Bg9XUwwBFJTXm6qmc"

# The SQL migration broken into individual statements
SQL_STATEMENTS = [
    # Drop tables
    "DROP TABLE IF EXISTS public.aftercare_plans CASCADE",
    "DROP TABLE IF EXISTS public.rebook_requests CASCADE",
    "DROP TABLE IF EXISTS public.consents CASCADE",
    "DROP TABLE IF EXISTS public.intake_responses CASCADE",
    "DROP TABLE IF EXISTS public.client_users CASCADE",
    "DROP TABLE IF EXISTS public.client_invites CASCADE",
    "DROP TABLE IF EXISTS public.tasks CASCADE",
    "DROP TABLE IF EXISTS public.photos CASCADE",
    "DROP TABLE IF EXISTS public.service_logs CASCADE",
    "DROP TABLE IF EXISTS public.formulas CASCADE",
    "DROP TABLE IF EXISTS public.appointments CASCADE",
    "DROP TABLE IF EXISTS public.services CASCADE",
    "DROP TABLE IF EXISTS public.clients CASCADE",
    "DROP TABLE IF EXISTS public.workspaces CASCADE",

    # Create tables
    """CREATE TABLE public.workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT,
      pronouns TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      duration_mins INT DEFAULT 60,
      default_template JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
      service_name TEXT NOT NULL,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ,
      duration_mins INT NOT NULL DEFAULT 60,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.service_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
      consult_notes TEXT,
      aftercare_notes TEXT,
      learning_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.formulas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
      service_type TEXT NOT NULL CHECK (service_type IN ('color', 'lighten', 'tone', 'gloss', 'other')),
      title TEXT NOT NULL,
      color_line TEXT,
      steps JSONB NOT NULL DEFAULT '[]',
      notes TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      caption TEXT,
      photo_type TEXT CHECK (photo_type IN ('before', 'after', 'progress', 'other')),
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      due_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.client_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.client_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, workspace_id)
    )""",

    """CREATE TABLE public.intake_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
      answers JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.consents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      photo_consent BOOLEAN DEFAULT false,
      chemical_consent BOOLEAN DEFAULT false,
      signature_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.rebook_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      preferred_dates JSONB DEFAULT '[]',
      service_type TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
      created_at TIMESTAMPTZ DEFAULT now()
    )""",

    """CREATE TABLE public.aftercare_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      client_visible_notes TEXT,
      recommended_products JSONB DEFAULT '[]',
      published_at TIMESTAMPTZ DEFAULT now()
    )""",

    # Enable RLS
    "ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.services ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.rebook_requests ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.aftercare_plans ENABLE ROW LEVEL SECURITY",

    # Workspace owner policies
    """CREATE POLICY "workspace_owner_all" ON public.workspaces FOR ALL USING (owner_id = auth.uid())""",

    """CREATE POLICY "workspace_owner_select" ON public.clients FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.clients FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.clients FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.clients FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.services FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.services FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.services FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.services FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.appointments FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.appointments FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.appointments FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.appointments FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.service_logs FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.service_logs FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.service_logs FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.service_logs FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.formulas FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.formulas FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.formulas FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.formulas FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.photos FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.photos FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.photos FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.photos FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.tasks FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.tasks FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.tasks FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.tasks FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_select" ON public.client_invites FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_insert" ON public.client_invites FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_update" ON public.client_invites FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_delete" ON public.client_invites FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    """CREATE POLICY "workspace_owner_all" ON public.client_users FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_all" ON public.intake_responses FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_all" ON public.consents FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_all" ON public.rebook_requests FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",
    """CREATE POLICY "workspace_owner_all" ON public.aftercare_plans FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))""",

    # Client portal policies
    """CREATE POLICY "client_user_select_own" ON public.intake_responses FOR SELECT USING (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_insert_own" ON public.intake_responses FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_select_aftercare" ON public.aftercare_plans FOR SELECT USING (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_select_consents" ON public.consents FOR SELECT USING (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_insert_consents" ON public.consents FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_select_rebook" ON public.rebook_requests FOR SELECT USING (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",
    """CREATE POLICY "client_user_insert_rebook" ON public.rebook_requests FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()))""",

    # Indexes
    "CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id)",
    "CREATE INDEX idx_clients_workspace_id ON public.clients(workspace_id)",
    "CREATE INDEX idx_clients_workspace_created ON public.clients(workspace_id, created_at DESC)",
    "CREATE INDEX idx_appointments_workspace_id ON public.appointments(workspace_id)",
    "CREATE INDEX idx_appointments_workspace_start ON public.appointments(workspace_id, start_at)",
    "CREATE INDEX idx_appointments_client_id ON public.appointments(client_id)",
    "CREATE INDEX idx_formulas_workspace_id ON public.formulas(workspace_id)",
    "CREATE INDEX idx_formulas_client_id ON public.formulas(client_id)",
    "CREATE INDEX idx_photos_client_id ON public.photos(client_id)",
    "CREATE INDEX idx_photos_appointment_id ON public.photos(appointment_id)",
    "CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id)",
    "CREATE INDEX idx_client_invites_token ON public.client_invites(token)",
    "CREATE INDEX idx_client_users_user_id ON public.client_users(user_id)",
    "CREATE INDEX idx_client_users_client_id ON public.client_users(client_id)",

    # Trigger function
    """CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql""",

    # Triggers
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.formulas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
    "CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
]

def run_sql(sql):
    """Execute SQL via Supabase's pg-meta API."""
    # Supabase uses a postgres REST proxy, but raw SQL needs their internal API
    # The Management API at api.supabase.com allows SQL execution

    # Try the pg endpoint (may not be publicly accessible)
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

    data = json.dumps({"sql": sql}).encode('utf-8')

    ctx = ssl.create_default_context()

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return f"Error {e.code}: {e.read().decode('utf-8')}"

def main():
    print("Opelle Database Migration")
    print("=" * 50)
    print()
    print("Note: Supabase doesn't expose raw SQL execution via REST API.")
    print("You need to run the migration using one of these methods:")
    print()
    print("1. Supabase Dashboard SQL Editor:")
    print("   https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/sql/new")
    print()
    print("2. Supabase CLI:")
    print("   supabase db push")
    print()
    print("3. Direct Postgres connection:")
    print("   psql postgresql://postgres:[PASSWORD]@db.qccrfgkfcdcezxzdtfpk.supabase.co:5432/postgres")
    print()
    print("The migration SQL is in: DATABASE_MIGRATION.sql")

if __name__ == "__main__":
    main()
