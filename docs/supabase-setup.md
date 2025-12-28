# Supabase Setup (Student Data)

## Where to run the SQL

1) Open the Supabase dashboard for your project.
2) Go to **SQL Editor**.
3) Create a new query and paste the contents of `supabase/migrations/001_init_student_data.sql`.
4) Run the query and confirm it completes without errors.

## What to verify

- Tables exist: `clients`, `appointments`, `formulas`.
- RLS is enabled on all three tables.
- Policies exist for SELECT/INSERT/UPDATE/DELETE enforcing `stylist_id = auth.uid()`.
- Triggers update `updated_at` on each table.

## Environment variables

Set these in Vercel (and locally in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Done when

- Tables exist and can be queried.
- RLS policies are visible in Supabase for all three tables.
