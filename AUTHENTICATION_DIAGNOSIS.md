# Authentication Issue Diagnosis

## Current Problem
Google OAuth authentication succeeds, but sessions don't persist, causing an infinite redirect loop.

## What We Know Works
✅ OAuth callback receives the code
✅ `exchangeCodeForSession` succeeds
✅ 3 cookies are set in the callback response
✅ No errors in the authentication flow

## What's Failing
❌ Cookies don't persist to subsequent requests
❌ `/api/debug-auth` shows 0 cookies
❌ User gets redirected back to login immediately

## Most Likely Causes

### 1. **Supabase Site URL Configuration** (MOST LIKELY)
**Issue**: Supabase's Site URL setting might not match your production domain.

**How to Check**:
1. Go to: https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/auth/url-configuration
2. Check "Site URL" - it MUST be: `https://www.opelle.app`
3. Check "Redirect URLs" - should include: `https://www.opelle.app/**`

**Why This Causes The Problem**:
- Supabase validates cookie domains against the Site URL
- If Site URL is wrong, cookies are set but immediately invalidated
- This is the #1 cause of "cookies not persisting" issues

### 2. **Missing RLS Policies**
**Issue**: Database might have RLS enabled but no policies defined.

**How to Check**:
1. Go to: https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/auth/policies
2. Check if `clients` table has RLS enabled
3. If enabled, ensure there are policies for SELECT, INSERT, UPDATE, DELETE

**Required Policies** (if RLS is enabled):
```sql
-- Allow users to read their own clients
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = stylist_id);

-- Allow users to insert their own clients
CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = stylist_id);

-- Allow users to update their own clients
CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = stylist_id);

-- Allow users to delete their own clients
CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = stylist_id);
```

### 3. **Cookie SameSite Issues with Supabase**
**Issue**: Cookies might be rejected due to cross-origin restrictions.

**Current Cookie Flow**:
- Login at: `www.opelle.app`
- OAuth redirects to: `qccrfgkfcdcezxzdtfpk.supabase.co` (Google OAuth)
- Callback to: `www.opelle.app/auth/callback`
- Cookies should be set for: `www.opelle.app`

**This should work**, but if Supabase's auth server is setting cookies with incompatible options, they'll be rejected.

## Immediate Action Required

### Step 1: Fix Site URL in Supabase (DO THIS FIRST)
1. https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/auth/url-configuration
2. Set Site URL to: `https://www.opelle.app`
3. Add to Redirect URLs: `https://www.opelle.app/**`
4. **Save changes**
5. **Redeploy your app in Vercel** (or just try logging in again)

### Step 2: Check RLS Policies
1. https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/database/tables
2. Click on `clients` table
3. Check if "Enable RLS" is turned on
4. If yes, click "Policies" tab and verify policies exist

### Step 3: Test After Site URL Fix
1. Clear your browser cookies completely
2. Go to `https://www.opelle.app`
3. Click "Continue with Google"
4. After redirect, check `/api/debug-auth`
5. Should show `authenticated: true` with cookies present

## Why Site URL is Critical

Supabase uses the Site URL to:
- Validate where OAuth callbacks can redirect to
- Set the correct domain for session cookies
- Validate token usage across requests

If it's set to `localhost` or a different domain, cookies will fail silently even though the OAuth flow completes successfully.

## Alternative: Check Browser DevTools

After logging in, check:
1. Open DevTools → Application → Cookies
2. Look for cookies on `www.opelle.app` domain
3. Look for cookies starting with `sb-qccrfgkfcdcezxzdtfpk-auth-token`
4. If cookies exist but have wrong domain/path/flags, that confirms the Site URL issue

## Expected Cookie Structure

When working correctly, you should see:
```
sb-qccrfgkfcdcezxzdtfpk-auth-token.0
sb-qccrfgkfcdcezxzdtfpk-auth-token.1
sb-qccrfgkfcdcezxzdtfpk-auth-token-code-verifier (temporary)
```

With properties:
- Domain: `.opelle.app` or `www.opelle.app`
- Path: `/`
- Secure: Yes (in production)
- HttpOnly: Yes
- SameSite: Lax
