# Authentication Setup Guide

This guide will help you set up Google OAuth authentication for Opelle.

## Step 1: Get Your Supabase Keys

1. Go to your Supabase project: https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/settings/api

2. Copy the following values:
   - **Project URL**: `https://qccrfgkfcdcezxzdtfpk.supabase.co`
   - **anon/public key**: Starts with `eyJ...` (this is safe for client-side code)
   - **service_role key**: Starts with `eyJ...` (keep this SECRET!)

## Step 2: Configure Environment Variables

### For Vercel Deployment:

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://qccrfgkfcdcezxzdtfpk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Make sure to add them for Production, Preview, and Development environments

### For Local Development:

1. Create a `.env.local` file in the root of your project
2. Add the same environment variables as above
3. This file is gitignored and won't be committed

## Step 3: Configure Google OAuth in Supabase

1. Go to: https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/auth/providers

2. Find "Google" in the providers list and click to configure

3. You'll need to create a Google OAuth Client:

   ### Create Google OAuth Credentials:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

   b. Create a new project or select an existing one

   c. Navigate to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"

   d. Configure the OAuth consent screen if prompted:
      - User Type: External
      - App name: Opelle
      - User support email: your-email@example.com
      - Authorized domains: your-domain.com
      - Developer contact: your-email@example.com

   e. Create OAuth Client ID:
      - Application type: Web application
      - Name: Opelle Production
      - Authorized JavaScript origins:
        - `https://qccrfgkfcdcezxzdtfpk.supabase.co`
        - Your production URL (e.g., `https://your-app.vercel.app`)
      - Authorized redirect URIs:
        - `https://qccrfgkfcdcezxzdtfpk.supabase.co/auth/v1/callback`

   f. Copy the **Client ID** and **Client Secret**

4. Back in Supabase Auth Providers:
   - Enable Google provider
   - Paste your **Client ID**
   - Paste your **Client Secret**
   - Save

## Step 4: Test Authentication

1. Deploy your changes to Vercel (or run locally with `npm run dev`)

2. Navigate to `/login`

3. Click "Continue with Google"

4. You should be redirected to Google's login page

5. After successful login, you'll be redirected to `/app`

6. Try creating a client - it should now work!

## Step 5: Verify Database Connection

To verify that authenticated users can create clients:

1. Log in via Google OAuth
2. Go to `/app/clients`
3. Click "Add Client"
4. Fill in client details and save
5. The client should appear in your list

The client will be associated with your Google account's user ID automatically.

## Troubleshooting

### "User must be authenticated to create a client"

- Make sure you're logged in
- Check that environment variables are set correctly in Vercel
- Clear browser cookies and try logging in again

### Google OAuth Error

- Verify redirect URIs match exactly in Google Cloud Console
- Make sure your domain is added to authorized domains
- Check that Google OAuth is enabled in Supabase

### Clients not showing up

- Check browser console for errors
- Verify you're logged in (check Network tab for auth cookies)
- Make sure RLS policies allow authenticated users to read their own clients

## Security Notes

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose - it respects Row Level Security (RLS) policies
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - never expose it in client code
- Always use `createSupabaseAuthServerClient()` for authenticated operations
- Only use `createSupabaseServerClient()` (service role) for admin operations

## Next Steps

Once authentication is working, you may want to:

1. Set up RLS policies in Supabase to secure your data
2. Add user profile management
3. Configure allowed email domains to restrict access
4. Add error handling for auth failures
