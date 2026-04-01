# BUG: lordanabelle@gmail.com gets owner permissions instead of student

## Status: OPEN

## Problem
lordanabelle@gmail.com signs in and sees full owner nav + "Owner" label, even though their workspace_members role is "student". belle@dominusfoundry.com is the actual owner.

## Database state (confirmed correct)
```sql
-- belle@dominusfoundry.com → owner (user_id: 4b26a350-f17e-44ee-9509-b6733ca18514)
-- lordanabelle@gmail.com → student (user_id: 75c66221-2c4a-4064-b6d0-2bd72ae4b17a)
```

## Suspected causes (not yet confirmed)
1. **Browser caching**: The permissions API response may be cached despite no-cache headers. Try clearing all site data for opelle.app in Chrome DevTools → Application → Storage → Clear site data.

2. **getWorkspaceId fallback**: If lordanabelle's user_id doesn't match workspace_members (e.g., different auth session), getWorkspaceId falls back to "first workspace". Then getMemberRole checks workspaces.owner_id first — if the first workspace's owner_id matches a DIFFERENT user than expected, this could return wrong results.

3. **Supabase auth session mismatch**: lordanabelle may have two auth.users entries (one from client portal, one from practitioner login) with different UUIDs. The workspace_members entry uses one UUID but the active session uses a different one.

## Debug steps to try
1. On the student browser, open DevTools → Network → find `/api/team/permissions` → check Response body for `{ role: "???" }`
2. Check Vercel runtime logs for `[team/permissions] lordanabelle@gmail.com → ???`
3. Run: `SELECT id, email FROM auth.users WHERE email = 'lordanabelle@gmail.com'` — if multiple rows, that's the issue
4. On the student browser, run in console: `(await (await fetch('/api/team/permissions')).json())` — shows what the API actually returns

## Fix once root cause is found
- If caching: already addressed with no-cache headers (commit 6ec8116)
- If duplicate auth users: delete the wrong one and update workspace_members.user_id
- If getWorkspaceId fallback: make getMemberRole match by user_id across ALL workspaces, not just the resolved one
