# Opelle v2

The operating system for student stylists. Track clients, appointments, formulas, and education in one place.

## Quick Start

### 1. Set up Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk)
2. Navigate to **SQL Editor**
3. Run the migration in `supabase/migrations/001_fresh_schema.sql`

### 2. Enable Google OAuth

1. Go to **Authentication > Providers > Google**
2. Enable Google provider
3. Add your Google OAuth credentials (from Google Cloud Console)
4. Set redirect URL to: `https://qccrfgkfcdcezxzdtfpk.supabase.co/auth/v1/callback`

### 3. Get your Anon Key

1. Go to **Settings > API**
2. Copy the `anon` (public) key
3. Add it to `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure

```
/src
  /app
    /app          # Student console (protected)
    /client       # Client portal (coming soon)
    /api          # API routes
  /components
    /ui           # UI components
  /lib
    /db           # Database functions
    /supabase     # Supabase clients
```

## Features

### Student Console
- **Dashboard** - Overview of appointments, clients, tasks
- **Clients** - Manage client profiles, notes, tags
- **Appointments** - Schedule and track appointments
- **Formulas** - Save color formulas with steps
- **Education** - Track learning tasks and goals
- **Settings** - Account and workspace settings

### Coming Soon
- Client Portal (intake forms, aftercare, rebooking)
- Photo uploads
- Service templates
- Data export

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (Auth + Database)
- TypeScript
- Vercel
