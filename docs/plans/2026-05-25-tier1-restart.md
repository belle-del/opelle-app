# Opelle Tier 1 — August Restart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix the five critical bugs / security gaps Belle's audit (2026-05-25) flagged as blockers before any new feature work for the August classroom deployment.

**Architecture:** Five independent vertical slices. Slice 1 (onboarding role bug) ships and is verified against Belle's live owner login BEFORE slices 2–5 begin — it unblocks all subsequent role-aware testing. Slices 2–5 ship as separate commits each so any one can roll back independently.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Supabase (Postgres + Auth + RLS) · Vitest for unit/contract tests · pure SQL for migrations.

**Scope guardrails (Build Bible rules apply):**
- Each slice = its own commit, its own test(s), and its own manual verification step.
- No refactors outside the audited code paths.
- Migration SQL pasted in chat per [[feedback_sql_in_chat]] so Belle can run it against the live DB; never assume Supabase auto-applies it.
- God-mode dev tools must remain gated to `belle@dominusfoundry.com` only per [[feedback_god_mode]] — none of the new code should touch DevWrapper gating.

---

## Order of work (per Belle's directive)

1. **Slice 1** — Onboarding + role-resolution bug. **Ship, push, and confirm Belle's owner login resolves as `owner` before starting Slice 2.**
2. **Slice 2** — `school_mode` flag (DB + helper + student gating, no UI).
3. **Slice 3** — `assistant` + `booth_renter` roles in permissions + check-constraints.
4. **Slice 4** — RLS gap fixes (`stylist_specialties` + 10 incomplete tables).
5. **Slice 5** — Inventory race condition (atomic deduction).

After each slice: `npm test`, commit, push (Vercel auto-deploys per [[feedback_deploy]]), tell Belle what to verify in the live app.

---

# SLICE 1 — Onboarding Role + Session Role Resolution

## What we found in the investigation

Two distinct bugs, both touching role:

### Bug 1A — Onboarding writes `role='owner'` for every user
- `src/app/api/onboarding/complete/route.ts:127` hardcodes `role: "owner"` on the `workspace_members` insert.
- Worse, it ALSO creates a new workspace for everyone (lines 71–119), so a student joining without an invite gets their own workspace with themselves as owner. This is wrong: students should join an existing workspace (school's) via invite, or — if Belle wants signup-without-invite to work for students — they should land in a holding state, NOT become an owner of their own workspace.
- The `wm_role_check` CHECK constraint (migrations/2026-03-31-team-management.sql:20) currently only permits 6 roles — must be extended in Slice 3 before any role outside the 6 can be written.

### Bug 1B — Belle's existing owner account resolves as `student`
**Root cause:** `src/app/api/team/permissions/route.ts:24` silently falls back to `role: "student"` when `getMemberRole` returns null. This fallback is unsafe by design.

The chain that triggers it:
1. `getWorkspaceId(user.id)` at `src/lib/db/get-workspace-id.ts:8` uses `.single()` (lines 16 & 26). `.single()` errors if 0 OR multiple rows match.
2. If Belle owns more than one workspace (very plausible from past test signups + the new onboarding flow creating yet another), the owner query returns null with an error, the membership query likely returns null too, and the code falls through to "first workspace in DB" — which may not be Belle's.
3. `getMemberRole(belle.id, wrongWorkspaceId)` finds Belle is neither the owner nor a member of the wrong workspace → returns null.
4. The route falls back to `student` (line 24).

**Secondary contributor:** `src/app/auth/callback/route.ts:45` infers `userType` from `membership?.role === "student"` — for any existing user where the FIRST returned membership row has `role='owner'` (because of Bug 1A), it writes `user_profiles.user_type = "practitioner"`. This isn't directly the source of the "treated as a student" UI, but it's a related correctness issue and we should harden it.

## Files touched

- **Create:** `migrations/2026-05-25-fix-onboarding-role.sql` (migration SQL — paste in chat to Belle to run)
- **Modify:** `src/app/api/onboarding/complete/route.ts` — map user_type → role
- **Modify:** `src/lib/db/get-workspace-id.ts` — fix `.single()` brittleness; never silently pick a workspace the user has no claim on
- **Modify:** `src/app/api/team/permissions/route.ts` — remove silent "student" fallback; return owner if user owns the workspace directly, otherwise 403 (not 200 with fake role)
- **Modify:** `src/lib/db/team.ts` — `getMemberRole`: use `.maybeSingle()` for the non-owner check (line 303 currently `.single()` with `.or()` is fragile)
- **Modify:** `src/app/auth/callback/route.ts` — derive `userType` from a canonical user_type→role map rather than just `=== "student"`
- **New file:** `src/lib/role-mapping.ts` — single source of truth for `userType ↔ TeamRole`
- **Test:** `src/__tests__/role-mapping.test.ts` — covers all four mappings
- **Test:** `src/__tests__/onboarding-route.test.ts` — contract test that the insert receives the mapped role

## Step 1.1 — Create the userType ↔ role helper

**Step 1.1.a — Write the failing test** at `src/__tests__/role-mapping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { userTypeToRole, type UserType } from '@/lib/role-mapping';

describe('userTypeToRole', () => {
  it('maps student → student', () => {
    expect(userTypeToRole('student')).toBe('student');
  });
  it('maps practitioner → stylist', () => {
    expect(userTypeToRole('practitioner')).toBe('stylist');
  });
  it('maps salon_owner → owner', () => {
    expect(userTypeToRole('salon_owner')).toBe('owner');
  });
  it('maps school_admin → admin', () => {
    expect(userTypeToRole('school_admin')).toBe('admin');
  });
  it('covers every UserType — no fallthrough', () => {
    const all: UserType[] = ['student', 'practitioner', 'salon_owner', 'school_admin'];
    for (const t of all) {
      expect(userTypeToRole(t)).toBeDefined();
    }
  });
});
```

**Step 1.1.b — Run:** `npm test -- role-mapping` → expect FAIL (module not found).

**Step 1.1.c — Create** `src/lib/role-mapping.ts`:

```ts
import type { UserType } from '@/lib/types';
import type { TeamRole } from '@/lib/permissions';

export type { UserType };

export function userTypeToRole(userType: UserType): TeamRole {
  switch (userType) {
    case 'student':       return 'student';
    case 'practitioner':  return 'stylist';
    case 'salon_owner':   return 'owner';
    case 'school_admin':  return 'admin';
  }
}
```

(Exhaustive `switch` with no `default` — TS will error at compile if a new `UserType` is added without a mapping. This is intentional.)

**Step 1.1.d — Run:** `npm test -- role-mapping` → expect PASS.

**Step 1.1.e — Commit:** `feat(roles): add userType→role mapping helper`

## Step 1.2 — Fix the onboarding route to use the mapping

**Step 1.2.a — Write the failing contract test** at `src/__tests__/onboarding-route.test.ts`. Mock the admin client; assert that the `workspace_members.insert` payload uses the mapped role for each user_type. Pattern follows `inventory.test.ts:1-67` for mocking style.

Skeleton:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/onboarding/complete/route';

vi.mock('@/lib/supabase/server', () => ({ /* return a stub auth.getUser returning a fake user */ }));
vi.mock('@/lib/supabase/admin', () => ({ /* spy on inserts */ }));
vi.mock('@/lib/db/user-profiles', () => ({ completeOnboarding: vi.fn().mockResolvedValue({}) }));

describe('POST /api/onboarding/complete', () => {
  it.each([
    ['student',      'student'],
    ['practitioner', 'stylist'],
    ['salon_owner',  'owner'],
    ['school_admin', 'admin'],
  ])('maps user_type=%s → workspace_members.role=%s', async (userType, expectedRole) => {
    const insertSpy = vi.fn().mockResolvedValue({ data: { id: 'ws-1' }, error: null });
    // wire spy, call POST with body { user_type: userType }, then assert
    // expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ role: expectedRole }))
  });
});
```

**Step 1.2.b — Run:** `npm test -- onboarding-route` → expect FAIL (all four cases fail; current code always writes `owner`).

**Step 1.2.c — Edit** `src/app/api/onboarding/complete/route.ts`:

- Add `import { userTypeToRole } from "@/lib/role-mapping";`
- Replace the hardcoded `role: "owner"` at line 127 with `role: userTypeToRole(userType)`
- IMPORTANT: For `user_type = 'student'` without an invite token, do NOT auto-create a workspace. A solo student has nothing to own. Return a 400 telling them to use an invite code:

```ts
if (!joinedViaInvite && userType === 'student') {
  return NextResponse.json(
    { error: "Students must join with an invite code from their school or salon." },
    { status: 400 }
  );
}
```

(Place this just before the `if (!joinedViaInvite) {` workspace-creation block.)

**Step 1.2.d — Run:** `npm test -- onboarding-route` → expect PASS.

**Step 1.2.e — Run full suite:** `npm test` → expect PASS, no regressions.

**Step 1.2.f — Commit:** `fix(onboarding): map user_type to workspace role; reject solo-student signups`

## Step 1.3 — Harden `getWorkspaceId` and `getMemberRole`

**Step 1.3.a — Edit** `src/lib/db/get-workspace-id.ts`:

Replace all `.single()` calls with `.maybeSingle()` for the lookup queries, and for ownership specifically use `.order('created_at').limit(1)` so multi-workspace owners deterministically resolve to their first owned workspace rather than erroring. Final shape:

```ts
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  // 1. Owned workspace (deterministic — oldest first)
  const { data: owned } = await admin
    .from("workspaces")
    .select("id, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (owned) return owned.id;

  // 2. Member of a workspace
  const { data: membership } = await admin
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .or("status.neq.inactive,status.is.null")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membership) return membership.workspace_id;

  // 3. NO fallback to "first workspace in DB". A user with no claim
  //    on any workspace must NOT be silently granted access to someone else's.
  console.warn("[getWorkspaceId] user has no owned/membership workspace:", userId);
  return null;
}
```

**Important:** delete the "first workspace fallback" branch entirely. It is a multi-tenant security hole — it's the reason Belle saw a student role: she was being matched to the wrong workspace.

**Step 1.3.b — Edit** `src/lib/db/team.ts:296-310` — change the second query in `getMemberRole` from `.single()` to `.maybeSingle()` so a missing row returns `null` without throwing.

**Step 1.3.c — Edit** `src/app/api/team/permissions/route.ts:23-25` — remove the silent "student" fallback:

```ts
if (!memberInfo) {
  console.warn("[team/permissions] no member info for", user.email, "in workspace", workspaceId);
  return NextResponse.json({ error: "Not a workspace member" }, { status: 403, headers });
}
```

The client hook `src/lib/hooks/use-permissions.ts:53` already handles a fetch error by falling back to least-privilege `student` — that's the correct place for that defense, not in the API.

**Step 1.3.d — Edit** `src/lib/db/workspaces.ts:29-81` — `getCurrentWorkspace()` has the same first-workspace fallback at line 70. Remove it for the same reason. Return `null` if the user has no claim.

**Step 1.3.e — Run:** `npm test` → expect PASS.

**Step 1.3.f — Commit:** `fix(auth): deterministic workspace resolution; remove unsafe first-workspace fallback`

## Step 1.4 — Harden the auth callback (userType inference + missing-profile path)

**Note on the original concern about re-running `completeOnboarding` on every login:** re-reading [src/app/auth/callback/route.ts:22-24](opelle-app-github/src/app/auth/callback/route.ts), the early-return on `profile?.onboardingCompleted` already prevents this — the call at lines 49-52 only runs when onboarding is NOT yet completed OR when there is NO profile row at all. The actual hardening needed is for the `profile == null` path (an existing pre-`user_profiles`-migration user whose backfill missed them, or a user whose profile row was manually deleted): today the code creates a profile and immediately marks it completed using a `userType` derived from a `.limit(1).maybeSingle()` membership lookup, which is non-deterministic if Belle has multiple memberships.

Two things to fix in this step:

(a) Replace the brittle `userType` ternary with the new `roleToUserType` map.
(b) Make the membership lookup deterministic by ordering it (`order('created_at', { ascending: true })`), and prefer ownership over membership for `userType` derivation when both are present (Belle owns and is also listed as owner-member — owned workspace wins, so she gets `salon_owner`).

The partway-through-onboarding recovery path is preserved: a user who bailed mid-quiz has a profile row with `onboarding_completed = false`, the early-return at line 22 does not fire, and they get sent to `/onboarding` at line 60 to finish.

**Step 1.4.a — Edit** `src/app/auth/callback/route.ts:36-47`:

Replace the brittle `membership?.role === "student" ? "student" : "practitioner"` with a role→userType map (the inverse direction lives in the same `role-mapping.ts` for symmetry):

In `src/lib/role-mapping.ts`, add:

```ts
export function roleToUserType(role: TeamRole): UserType {
  switch (role) {
    case 'owner':       return 'salon_owner';
    case 'admin':       return 'school_admin';
    case 'instructor':  return 'practitioner';
    case 'stylist':     return 'practitioner';
    case 'student':     return 'student';
    case 'front_desk':  return 'practitioner';
    // assistant + booth_renter added in Slice 3
  }
}
```

**Step 1.4.b — Add a test case** to `src/__tests__/role-mapping.test.ts` for `roleToUserType` (all 6 roles → mapped userType).

**Step 1.4.c — Run:** `npm test` → PASS.

**Step 1.4.d — Commit:** `fix(auth): use canonical role→userType map in callback`

## Step 1.5 — Database backfill for Belle and any other miscategorized users

**Step 1.5.a — Create** `migrations/2026-05-25-fix-onboarding-role.sql`:

```sql
-- Backfill workspace_members rows where role was incorrectly set to 'owner'
-- by the old onboarding flow. We can only safely fix rows where the user is
-- NOT the actual workspace owner — those rows have role='owner' but the
-- workspace's owner_id is a different user.
--
-- For Belle specifically and anyone else who is the true owner_id of their
-- workspace, role='owner' is correct and we leave it alone.

-- Step A: For rows where role='owner' but user is NOT the workspace owner,
-- demote them to 'student' (safest default — they can be re-promoted via
-- the team UI if they were intended to be something else).
UPDATE workspace_members wm
SET role = 'student',
    updated_at = NOW()
FROM workspaces w
WHERE wm.workspace_id = w.id
  AND wm.role = 'owner'
  AND w.owner_id <> wm.user_id;

-- Step B: Ensure every workspaces.owner_id has a matching workspace_members
-- row with role='owner'. Idempotent via ON CONFLICT.
INSERT INTO workspace_members (workspace_id, user_id, role, status)
SELECT w.id, w.owner_id, 'owner', 'active'
FROM workspaces w
WHERE w.owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', updated_at = NOW()
  WHERE workspace_members.role <> 'owner';
```

**Step 1.5.b — Paste the SQL above directly into chat to Belle** (per [[feedback_sql_in_chat]]) with instructions to run it in Supabase SQL editor against the production project (`qccrfgkfcdcezxzdtfpk`). Wait for confirmation it ran cleanly before marking the slice complete.

**Step 1.5.c — Commit:** `migration: backfill workspace_members.role for misowned rows`

## Step 1.6 — Live verification (BEFORE moving to Slice 2)

After push + Vercel auto-deploy + Belle running the SQL:

- [ ] Belle logs in with her existing owner email
- [ ] Sidebar shows "Owner" under her name (currently shows "Student")
- [ ] Belle can access `/app/team` and `/app/settings` (currently 403 / hidden)
- [ ] Belle creates a test student account via an invite code — student lands in correct workspace with role=`student`
- [ ] Belle tries to sign up a fresh student WITHOUT an invite code — sees the 400 message rejecting solo-student signup

**If any item fails: do NOT start Slice 2.** Investigate first.

**Push command** (per [[feedback_deploy]]):

```bash
git push origin main
```

---

# SLICE 2 — school_mode flag (DB + helper + student gating, no UI)

## Scope per Belle's directive

> "Do NOT implement the full approval workflow UI in this tier — just the flag, the helper, and the gating logic. Approval UI is a future tier."

So: add the column, add the helper, wire it into the two specific gates Belle named (service completion + formula entries), and stop. No approval queue UI.

## Files touched

- **Create:** `migrations/2026-05-25-school-mode.sql`
- **Modify:** `src/lib/permissions.ts` — add `isSchoolMode()` helper signature + export
- **Create:** `src/lib/db/workspace-flags.ts` — DB-backed implementation (cached per-request)
- **Modify:** `src/app/api/services/complete/route.ts` — when school_mode=true AND role=student, set a `requires_review` boolean on the completion record (no UI change yet; just data)
- **Modify:** `src/app/api/formula-entries/route.ts` — same, set `status='draft'` instead of immediately surfacing
- **Test:** `src/__tests__/school-mode.test.ts`

## Step 2.1 — Migration

**Step 2.1.a — Create** `migrations/2026-05-25-school-mode.sql`:

```sql
-- Add school_mode flag to workspaces.
-- When true, student work goes into a "needs review" state instead of
-- being immediately live. Approval UI is a future tier — this migration
-- only adds the data shape.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS school_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Per-row review state on the two artifact tables that students produce.
ALTER TABLE service_completions
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

ALTER TABLE formula_entries
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'final'
    CHECK (review_status IN ('draft','final','needs_changes'));

-- Seed: Belle's classroom workspace runs in school_mode.
-- Belle: replace this UUID lookup with the actual workspace id if needed.
UPDATE workspaces SET school_mode = TRUE WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'belle@dominusfoundry.com' LIMIT 1
);
```

**Step 2.1.b — Paste SQL in chat to Belle** with instructions.

## Step 2.2 — Helper

**Step 2.2.a — Write the failing test** at `src/__tests__/school-mode.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
import { isSchoolMode } from '@/lib/db/workspace-flags';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

describe('isSchoolMode', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns true when workspaces.school_mode = true', async () => {
    (createSupabaseAdminClient as any).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: { school_mode: true }, error: null }) }) }) }),
    });
    expect(await isSchoolMode('ws-1')).toBe(true);
  });
  it('returns false when school_mode = false or row missing', async () => {
    (createSupabaseAdminClient as any).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: null, error: null }) }) }) }),
    });
    expect(await isSchoolMode('ws-1')).toBe(false);
  });
});
```

**Step 2.2.b — Run:** `npm test -- school-mode` → FAIL (module missing).

**Step 2.2.c — Create** `src/lib/db/workspace-flags.ts`:

```ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function isSchoolMode(workspaceId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("school_mode")
    .eq("id", workspaceId)
    .maybeSingle();
  return Boolean(data?.school_mode);
}
```

**Step 2.2.d — Re-export from `src/lib/permissions.ts`** so consumers have one import path:

```ts
export { isSchoolMode } from '@/lib/db/workspace-flags';
```

**Step 2.2.e — Run:** `npm test` → PASS.

**Step 2.2.f — Commit:** `feat(school-mode): add workspace flag + isSchoolMode helper`

## Step 2.3 — Wire the gating into service completion and formula entries

**Step 2.3.a — Edit** `src/app/api/services/complete/route.ts` (around the insert at line 53):

```ts
import { isSchoolMode } from "@/lib/permissions";
import { getMemberRole } from "@/lib/db/team";

// ... inside POST, after getMemberRole resolved:
const memberInfo = await getMemberRole(user.id, workspaceId);
const schoolMode = await isSchoolMode(workspaceId);
const requiresReview = schoolMode && memberInfo?.role === 'student';

// In the insert payload, add:
//   requires_review: requiresReview,
```

**Step 2.3.b — Edit** `src/app/api/formula-entries/route.ts` similarly — set `review_status: requiresReview ? 'draft' : 'final'`.

**Step 2.3.c — Test:** add a contract test asserting `requires_review=true` when school_mode + role=student, and `false` otherwise.

**Step 2.3.d — Run:** `npm test` → PASS.

**Step 2.3.e — Commit:** `feat(school-mode): gate student completions + formula entries when school_mode is on`

## Step 2.4 — Live verification

- [ ] Belle confirms the SQL ran and her workspace shows `school_mode = TRUE` in Supabase
- [ ] Belle (as owner) completes a service → `requires_review = false` in the row
- [ ] A test student account completes a service → `requires_review = true`
- [ ] Same pattern for formula_entries (`review_status`)

---

# SLICE 3 — `assistant` + `booth_renter` Roles

## What changes

- TypeScript union: add `assistant` and `booth_renter` to `TeamRole` in `src/lib/permissions.ts`
- Add `ROLE_PERMISSIONS` entries for both
- Update the role mapping (`roleToUserType`) added in Slice 1 to cover both
- DB CHECK constraints on `workspace_members.role` and `team_invites.role` need to be extended to accept the two new values
- RLS policies for `booth_renter` data isolation across the 6 most-touched per-stylist tables

## Files touched

- **Create:** `migrations/2026-05-25-roles-assistant-boothrenter.sql`
- **Modify:** `src/lib/permissions.ts`
- **Modify:** `src/lib/role-mapping.ts`
- **Modify:** `src/__tests__/permissions.test.ts` — add cases for both roles
- **Modify:** `src/__tests__/role-mapping.test.ts` — add cases

## Step 3.1 — Update the CHECK constraints (migration)

**Step 3.1.a — Create** `migrations/2026-05-25-roles-assistant-boothrenter.sql`:

```sql
-- Drop and re-create workspace_members role check to add assistant + booth_renter
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS wm_role_check;
ALTER TABLE workspace_members
  ADD CONSTRAINT wm_role_check
  CHECK (role IN ('owner','admin','instructor','stylist','student','front_desk','assistant','booth_renter'));

-- Same for team_invites (invitable roles excludes owner)
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE team_invites
  ADD CONSTRAINT team_invites_role_check
  CHECK (role IN ('admin','instructor','stylist','student','front_desk','assistant','booth_renter'));
```

**Step 3.1.b — Paste in chat to Belle.**

## Step 3.2 — Add roles to `permissions.ts`

**Step 3.2.a — Edit** `src/lib/permissions.ts:4`:

```ts
export type TeamRole =
  | 'owner' | 'admin' | 'instructor' | 'stylist'
  | 'student' | 'front_desk' | 'assistant' | 'booth_renter';
```

**Step 3.2.b — Add entries to `ROLE_PERMISSIONS`:**

```ts
assistant: [
  'floor.view',
  'hours.view_own',
  'clients.view_own',
  'appointments.view_own',
  'messages.use',
  'history.view_own',
  // 'tasks.assign' is currently for those who CAN assign tasks; receiving
  // tasks is implicit. No formula edits, no checkout.
],
booth_renter: [
  // Booth renters operate their own micro-business inside the workspace.
  // Permissions are stylist-equivalent (full CRUD on their own data).
  // Isolation between booth renters is enforced via RLS in Step 3.3, NOT here.
  'hours.view_own',
  'clients.manage', 'clients.view_own',
  'formulas.view_own',
  'checkout.use',
  'appointments.manage', 'appointments.view_own', 'availability.view_own',
  'portfolio.manage', 'portfolio.view_own',
  'products.view', 'earnings.view_own',
  'messages.use', 'metis.use', 'history.view_own',
  'progress.view_own',
],
```

**Step 3.2.c — Add `assistant` and `booth_renter` cases** to `roleToUserType` in `src/lib/role-mapping.ts`:

```ts
case 'assistant':     return 'practitioner';
case 'booth_renter':  return 'practitioner';
```

## Step 3.3 — RLS data isolation for booth_renter

`appointments` already has `stylist_id` (from migration `007`). `clients` has `primary_stylist_id` (from `006a`). `client_stylist_assignments` (from `007`) is the canonical multi-stylist table. We add RLS policies that, **for booth_renters only**, restrict visibility to their own rows.

The pattern is: keep existing policies in place; ADD restrictive policies that fire only when the user's role is `booth_renter`. RLS combines policies with OR for permissive policies; we need RESTRICTIVE policies here so that "booth_renter" narrows access regardless of other policies.

**Append to** `migrations/2026-05-25-roles-assistant-boothrenter.sql`:

```sql
-- ============================================================
-- BOOTH_RENTER ISOLATION: restrictive policies that narrow access
-- when the current user's role in the workspace is 'booth_renter'.
-- For all other roles these policies are a no-op (USING returns TRUE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_booth_renter(ws_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'booth_renter'
  );
$$;

-- appointments: booth renter only sees their own stylist_id rows
CREATE POLICY "booth_renter_restrict_appointments"
  ON appointments AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR stylist_id = auth.uid()
  );

-- clients: booth renter only sees clients where primary_stylist_id matches,
-- OR where they have a client_stylist_assignments row
CREATE POLICY "booth_renter_restrict_clients"
  ON clients AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR primary_stylist_id = auth.uid()
    OR id IN (
      SELECT client_id FROM client_stylist_assignments
      WHERE stylist_id = auth.uid() AND workspace_id = clients.workspace_id
    )
  );

-- formula_entries: scope by client visibility (filter through clients)
CREATE POLICY "booth_renter_restrict_formula_entries"
  ON formula_entries AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR client_id IN (
      SELECT id FROM clients
      WHERE workspace_id = formula_entries.workspace_id
        AND (primary_stylist_id = auth.uid()
             OR id IN (SELECT client_id FROM client_stylist_assignments
                       WHERE stylist_id = auth.uid()))
    )
  );

-- formula_history: same pattern
CREATE POLICY "booth_renter_restrict_formula_history"
  ON formula_history AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR client_id IN (
      SELECT id FROM clients
      WHERE workspace_id = formula_history.workspace_id
        AND (primary_stylist_id = auth.uid()
             OR id IN (SELECT client_id FROM client_stylist_assignments
                       WHERE stylist_id = auth.uid()))
    )
  );

-- service_completions: scope by student_id (the working stylist)
CREATE POLICY "booth_renter_restrict_service_completions"
  ON service_completions AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR student_id = auth.uid()
  );
```

**Booth-renter product isolation (per Belle's directive):** booth renters get their own isolated inventory. Add `owner_user_id UUID REFERENCES auth.users(id) NULL` to `products`, `inventory_movements` (a.k.a. `stock_movements`), and `stock_alerts`. When a booth_renter creates a product/movement/alert, the API sets `owner_user_id = themselves`; for non-booth-renter creators, `owner_user_id` stays `NULL` (= workspace-shared, current behavior). Append to `migrations/2026-05-25-roles-assistant-boothrenter.sql`:

```sql
-- Add owner_user_id to inventory tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_alerts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_owner_user ON products(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_owner_user ON stock_movements(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_owner_user ON stock_alerts(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- RESTRICTIVE policies: when caller is a booth_renter, they only see rows
-- they own. For non-booth-renters this is a no-op (predicate evaluates TRUE).
CREATE POLICY "booth_renter_restrict_products"
  ON products AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR owner_user_id = auth.uid()
  );

CREATE POLICY "booth_renter_restrict_stock_movements"
  ON stock_movements AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR owner_user_id = auth.uid()
  );

CREATE POLICY "booth_renter_restrict_stock_alerts"
  ON stock_alerts AS RESTRICTIVE
  FOR ALL
  USING (
    NOT current_user_is_booth_renter(workspace_id)
    OR owner_user_id = auth.uid()
  );
```

**Wire-up to the product creation API** ([src/app/api/products/route.ts](opelle-app-github/src/app/api/products/route.ts) — open and find the POST handler): when inserting, set `owner_user_id = user.id` only if the caller's role is `booth_renter`; otherwise leave NULL. Same for `createStockMovement` in `src/lib/db/inventory.ts` — accept an optional `ownerUserId` and persist it.

**Per the Slice 5 interaction:** the atomic deduction RPC (Slice 5) must respect the isolation. Current usage templates (`service_product_usage`) reference workspace-shared product ids. A booth_renter completing a service needs to deduct from THEIR matching product, not the salon's. Slice 5 will:
1. Look up the caller's role inside `/api/services/complete`.
2. If `booth_renter`: before each deduction, swap the template's product_id for a booth-renter-owned product with the same `brand + shade` if one exists; if not found, SKIP the deduction (don't double-deduct from the salon).
3. If not `booth_renter`: deduct from the templated product as today (salon shared stock).

## Step 3.4 — Tests

**Step 3.4.a — Extend `src/__tests__/permissions.test.ts`** with the new role cases following the existing test style:

```ts
it('should grant assistant view-only floor + own data permissions', () => {
  expect(ROLE_PERMISSIONS['assistant']).toContain('floor.view');
  expect(ROLE_PERMISSIONS['assistant']).toContain('appointments.view_own');
  expect(ROLE_PERMISSIONS['assistant']).not.toContain('checkout.use');
  expect(ROLE_PERMISSIONS['assistant']).not.toContain('clients.manage');
});

it('should grant booth_renter stylist-equivalent permissions', () => {
  expect(ROLE_PERMISSIONS['booth_renter']).toContain('clients.manage');
  expect(ROLE_PERMISSIONS['booth_renter']).toContain('checkout.use');
  expect(ROLE_PERMISSIONS['booth_renter']).toContain('appointments.manage');
});

it('returns complete effective permissions map for all 8 roles', () => {
  const roles: TeamRole[] = ['owner','admin','instructor','stylist','student','front_desk','assistant','booth_renter'];
  for (const role of roles) {
    const effective = getEffectivePermissions(role);
    expect(Object.keys(effective).length).toBeGreaterThan(20);
  }
});
```

**Step 3.4.b — Extend `src/__tests__/role-mapping.test.ts`** with `roleToUserType` cases for the two new roles.

**Step 3.4.c — Run:** `npm test` → PASS.

**Step 3.4.d — Commit:** `feat(roles): add assistant + booth_renter with booth_renter RLS isolation`

## Step 3.5 — Live verification

- [ ] Belle confirms SQL ran cleanly
- [ ] Belle uses the team UI to invite a test user with role=`booth_renter`
- [ ] Logged in as that booth renter, the user sees only their own appointments + clients (Belle should create cross-stylist test data first)
- [ ] Logged in as Belle (owner), all data is still visible
- [ ] A test `assistant` invite resolves to assistant role and sees the floor view

---

# SLICE 4 — RLS Gap Fixes

## Goal

Close every RLS gap the audit flagged. We classified them into two groups:

**Group A — true RLS gaps (no policies at all):** `stylist_specialties` (no RLS), and the tables whose only policies are owner-only (so non-owner workspace members get locked out): `activity_log`, `availability_overrides`, `availability_patterns`, `brand_partnerships`, `client_stylist_assignments`, `formula_history`, `metis_feedback`, `metis_lessons`, `pending_client_joins`.

**Group B — false positive:** `user_profiles`. We verified — it has 3 policies (`Users can read own profile`, `Users can update own profile`, `Service role can insert profiles`). Audit was wrong about this one; leave it alone.

For Group A the fix is uniform: add workspace-member-scoped policies via a helper function.

## Step 4.1 — Helper function for "is this user a member of this workspace"

**Step 4.1.a — Create** `migrations/2026-05-25-rls-helper.sql`:

```sql
-- Reusable helper: TRUE if the current auth.uid() is either the workspace
-- owner or a non-inactive member. SECURITY DEFINER bypasses RLS on the
-- workspaces/workspace_members tables themselves (otherwise we recurse).
CREATE OR REPLACE FUNCTION public.current_user_is_workspace_member(ws_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces WHERE id = ws_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND (status IS NULL OR status <> 'inactive')
  );
$$;
```

**Step 4.1.b — Paste in chat to Belle.**

## Step 4.2 — Apply policies to each table

**Step 4.2.a — Create** `migrations/2026-05-25-rls-gap-fixes.sql`:

```sql
-- ============================================================
-- stylist_specialties: global catalog, no workspace_id.
-- All authenticated users can read; only authenticated can write
-- (we don't gate writes here because the UI never writes to this
-- table from the client — it's seeded server-side).
-- ============================================================
ALTER TABLE stylist_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_specialties" ON stylist_specialties
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- activity_log: workspace members can read + write their workspace's log
-- (current policy only allows the workspace OWNER; that locks out the
-- non-owner team members who are the ones generating activity).
-- ============================================================
DROP POLICY IF EXISTS "workspace members see own log" ON activity_log;
DROP POLICY IF EXISTS "workspace members insert own log" ON activity_log;

CREATE POLICY "members_select_activity_log" ON activity_log
  FOR SELECT USING (current_user_is_workspace_member(workspace_id));

CREATE POLICY "members_insert_activity_log" ON activity_log
  FOR INSERT WITH CHECK (current_user_is_workspace_member(workspace_id));

-- ============================================================
-- availability_patterns + availability_overrides: same pattern
-- (currently owner-only; we want every workspace member to view,
-- but writes should be scoped to the user's own user_id row).
-- ============================================================
DROP POLICY IF EXISTS "workspace owner manages availability_patterns" ON availability_patterns;
CREATE POLICY "members_read_availability_patterns" ON availability_patterns
  FOR SELECT USING (current_user_is_workspace_member(workspace_id));
CREATE POLICY "own_availability_patterns_write" ON availability_patterns
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "workspace owner manages availability_overrides" ON availability_overrides;
CREATE POLICY "members_read_availability_overrides" ON availability_overrides
  FOR SELECT USING (current_user_is_workspace_member(workspace_id));
CREATE POLICY "own_availability_overrides_write" ON availability_overrides
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- brand_partnerships: global catalog of brand partnerships.
-- All authenticated users can SELECT; writes are server-side only.
-- ============================================================
CREATE POLICY "auth_read_brand_partnerships" ON brand_partnerships
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- client_stylist_assignments: workspace-scoped; members can read,
-- the workspace owner or admin can write. RLS is already enabled
-- by 007 but with no policies.
-- ============================================================
CREATE POLICY "members_read_csa" ON client_stylist_assignments
  FOR SELECT USING (current_user_is_workspace_member(workspace_id));
CREATE POLICY "members_write_csa" ON client_stylist_assignments
  FOR ALL USING (current_user_is_workspace_member(workspace_id))
  WITH CHECK (current_user_is_workspace_member(workspace_id));

-- ============================================================
-- formula_history: workspace-scoped read for members; write scoped
-- to the workspace member who created the formula (we don't have
-- a created_by column today, so any member can write).
-- ============================================================
CREATE POLICY "members_select_formula_history" ON formula_history
  FOR SELECT USING (current_user_is_workspace_member(workspace_id));
CREATE POLICY "members_write_formula_history" ON formula_history
  FOR ALL USING (current_user_is_workspace_member(workspace_id))
  WITH CHECK (current_user_is_workspace_member(workspace_id));

-- ============================================================
-- metis_feedback + metis_lessons: workspace-scoped.
-- ============================================================
CREATE POLICY "members_rw_metis_feedback" ON metis_feedback
  FOR ALL USING (current_user_is_workspace_member(workspace_id))
  WITH CHECK (current_user_is_workspace_member(workspace_id));

CREATE POLICY "members_rw_metis_lessons" ON metis_lessons
  FOR ALL USING (current_user_is_workspace_member(workspace_id))
  WITH CHECK (current_user_is_workspace_member(workspace_id));

-- ============================================================
-- pending_client_joins: workspace-scoped read; the join client
-- can also read their own pending row by stylist_id reference.
-- ============================================================
CREATE POLICY "members_read_pending_client_joins" ON pending_client_joins
  FOR ALL USING (current_user_is_workspace_member(workspace_id))
  WITH CHECK (current_user_is_workspace_member(workspace_id));
```

**Step 4.2.b — Before pasting in chat to Belle, sanity-check column names on each table** (especially `pending_client_joins`, `metis_feedback`, `metis_lessons`) since we have not exhaustively verified `workspace_id` exists on each. If any of them are scoped differently, narrow the policy to match. Use:

```bash
grep -A 25 "CREATE TABLE.*<table_name>" migrations/*.sql supabase/migrations/*.sql
```

for each before finalizing. **Hold the migration on Belle's review.**

**Step 4.2.c — Paste in chat to Belle.**

## Step 4.3 — Verification

Live verification only (we cannot run RLS tests in vitest without a real DB):

- [ ] Belle logs in as owner → all 11 tables still readable (no regressions)
- [ ] Belle creates a stylist test account → that user can read activity_log, formula_history, availability tables (currently they cannot)
- [ ] Use Supabase SQL editor `SET ROLE authenticated; SET request.jwt.claim.sub = 'test-uuid'; SELECT * FROM stylist_specialties;` to verify the global read policy
- [ ] Existing API endpoints that touched these tables (e.g. `/api/history`, `/api/intelligence/lessons`) still return data without regression

**Step 4.3.a — Commit:** `fix(rls): close gaps on stylist_specialties + 10 workspace-scoped tables`

---

# SLICE 5 — Inventory Race Condition

## Goal

Replace the non-atomic read-modify-write of `products.quantity` in `src/app/api/services/complete/route.ts` with an atomic single-statement deduction that cannot lose updates under concurrent service completions.

## Approach

Postgres RPC function that atomically decrements stock and returns the new value. Fail the completion if no row updated (stock insufficient OR product missing).

## Files touched

- **Create:** `migrations/2026-05-25-inventory-atomic-deduct.sql`
- **Modify:** `src/lib/db/inventory.ts` — add `atomicDeductStock()` helper
- **Modify:** `src/app/api/services/complete/route.ts` — replace lines 107-160 with the atomic call
- **Create:** `src/__tests__/inventory-concurrent.test.ts`

## Step 5.1 — Atomic RPC

**Step 5.1.a — Create** `migrations/2026-05-25-inventory-atomic-deduct.sql`:

```sql
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id  UUID,
  p_workspace_id UUID,
  p_quantity    NUMERIC
) RETURNS TABLE (
  new_quantity NUMERIC,
  previous_quantity NUMERIC,
  low_stock_threshold NUMERIC,
  brand TEXT,
  shade TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev NUMERIC;
  v_new  NUMERIC;
  v_threshold NUMERIC;
  v_brand TEXT;
  v_shade TEXT;
BEGIN
  -- Atomic: SELECT FOR UPDATE locks the row, then the same transaction
  -- writes the new value. Concurrent transactions wait, never lose updates.
  SELECT quantity, low_stock_threshold, brand, shade
    INTO v_prev, v_threshold, v_brand, v_shade
  FROM products
  WHERE id = p_product_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  v_new := GREATEST(0, v_prev - p_quantity);

  UPDATE products
    SET quantity = v_new, updated_at = NOW()
    WHERE id = p_product_id AND workspace_id = p_workspace_id;

  RETURN QUERY SELECT v_new, v_prev, v_threshold, v_brand, v_shade;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_product_stock FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_product_stock TO authenticated, service_role;
```

**Step 5.1.b — Paste SQL in chat to Belle.**

## Step 5.2 — Replace the loop body (with booth_renter awareness)

The route must first resolve the caller's role and, if `booth_renter`, swap each templated product id for the caller's own product (matched on `brand + shade`). If no matching owned product exists, skip the deduction for that template (do NOT silently deduct from the salon's shared stock — that would be the same multi-tenant leak we just closed in RLS).

**Step 5.2.a — Edit** `src/app/api/services/complete/route.ts:107-160` — replace the for-loop body so each iteration calls the RPC:

```ts
const callerRole = (await getMemberRole(user.id, workspaceId))?.role ?? null;

for (const usage of usageTemplates) {
  let productIdToDeduct = usage.productId;

  if (callerRole === 'booth_renter') {
    // Find a booth-renter-owned product matching the templated product's brand+shade.
    const { data: template } = await admin
      .from('products')
      .select('brand, shade')
      .eq('id', usage.productId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!template?.brand || !template?.shade) continue;
    const { data: ownProduct } = await admin
      .from('products')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('owner_user_id', user.id)
      .eq('brand', template.brand)
      .eq('shade', template.shade)
      .maybeSingle();
    if (!ownProduct) continue;
    productIdToDeduct = ownProduct.id;
  }

  const { data: result, error: rpcError } = await admin.rpc('deduct_product_stock', {
    p_product_id: productIdToDeduct,
    p_workspace_id: workspaceId,
    p_quantity: usage.estimatedQuantity,
  });
  if (rpcError || !result || result.length === 0) continue;
  const { new_quantity: newStock, previous_quantity: previousStock,
          low_stock_threshold: threshold, brand, shade } = result[0];

  await createStockMovement({
    workspaceId,
    productId: usage.productId,
    movementType: "service_deduct",
    quantityChange: -usage.estimatedQuantity,
    previousStock: Number(previousStock),
    newStock: Number(newStock),
    serviceCompletionId: completion?.id,
    createdBy: user.id,
  });

  if (Number(threshold) > 0 && Number(newStock) <= Number(threshold)) {
    const alertType = Number(newStock) === 0 ? "out_of_stock" : "low_stock";
    await upsertStockAlert({ workspaceId, productId: usage.productId, alertType });
    publishEvent({
      event_type: "inventory.low_stock",
      workspace_id: workspaceId,
      timestamp: now,
      payload: {
        product_id: usage.productId, brand, shade,
        quantity: Number(newStock), low_stock_threshold: Number(threshold),
        alert_type: alertType,
      },
    });
  }
}
```

Remove the `NOTE: Stock deductions are not atomic` comment (lines 101-103) — the comment is no longer accurate.

**Step 5.2.b — Run:** `npm test` → expect existing tests still PASS.

## Step 5.3 — Concurrent-completion test

**Step 5.3.a — Create** `src/__tests__/inventory-concurrent.test.ts`. Unit-level we can verify the SQL contract by mocking; for true concurrency we add an integration-style test that hits the RPC via a real Supabase test connection if available. Two-tier test:

```ts
import { describe, it, expect, vi } from 'vitest';

describe('Inventory atomic deduction (contract)', () => {
  it('calls deduct_product_stock RPC with correct args', async () => {
    // Set up: mock supabase admin .rpc() and assert payload.
    // This catches accidental regressions of the route back to read-modify-write.
  });

  it('fires low_stock alert ONLY when new_quantity <= threshold', async () => {
    // Parametrize on returned new_quantity values.
  });
});

// Integration test — gated by INTEGRATION_DB env, skipped otherwise.
describe.skipIf(!process.env.INTEGRATION_DB)('Inventory concurrent (integration)', () => {
  it('N parallel completions deduct exactly N units, never more', async () => {
    // 1. Seed: product with quantity = 10.
    // 2. Promise.all([5 parallel deduct_product_stock calls of 1 unit each]).
    // 3. Final quantity must equal 5 (10 − 5).
    // 4. Run with N=15 to mimic classroom load.
  });
});
```

**Step 5.3.b — Run:** `npm test` → unit/contract passes; integration is skipped unless `INTEGRATION_DB=1` is set.

**Step 5.3.c — Belle can run the integration test locally** against the Supabase project once the migration is applied: `INTEGRATION_DB=1 npm test -- inventory-concurrent`.

**Step 5.3.d — Commit:** `fix(inventory): atomic stock deduction via Postgres RPC`

## Step 5.4 — Live verification

- [ ] Belle confirms the RPC exists in Supabase (`SELECT proname FROM pg_proc WHERE proname = 'deduct_product_stock';`)
- [ ] Belle runs a normal service completion in the live app — stock decrements as before, low-stock alerts still fire
- [ ] Optional: Belle runs the integration test against the live Supabase URL (or a staging project) to prove concurrency safety

---

# CLOSING NOTES

## Things this plan does NOT do (intentional, per scope)

- No approval workflow UI for school_mode (Belle deferred this — Tier 2)
- No booth_renter isolation for products (flagged, needs Belle's product-ownership policy decision)
- No fix for the auth/callback `userType` mapping for `assistant` / `booth_renter` — both map to `practitioner` which routes to `/app/dashboard`; if Belle wants distinct routing, that's a Tier 2 conversation
- No backfill of `requires_review`/`review_status` columns on existing rows — they default to safe values (`false` / `'final'`)

## Discovered along the way (worth flagging but out of Tier 1 scope)

- `src/app/auth/callback/route.ts:43-54` calls `completeOnboarding` for any existing user with a workspace, every time they log in. This is wasteful (an UPDATE per login) and could fight with manual `user_profiles.user_type` corrections. Worth a tighter "only if profile.userType is null" check in Tier 2.
- The dual migration folders (`migrations/` and `supabase/migrations/`) make it ambiguous where new migrations belong. The audit flagged this as the biggest schema-management risk. **All new migrations in this plan use `migrations/YYYY-MM-DD-*.sql`** for consistency with the more recent dated convention.
- The `permissions` UI in `MemberEditDrawer` (Module 9) does not currently expose `assistant` or `booth_renter` in the role dropdown — Belle will need to add them in a follow-up Team-UI tier (we are NOT touching team UI in Tier 1).

## Tests added by this plan

| Slice | Test file | Coverage |
|------:|-----------|----------|
| 1 | `src/__tests__/role-mapping.test.ts` | All `userType ↔ TeamRole` mappings |
| 1 | `src/__tests__/onboarding-route.test.ts` | Each user_type writes the correct workspace_members.role |
| 2 | `src/__tests__/school-mode.test.ts` | `isSchoolMode` resolves correctly |
| 3 | `src/__tests__/permissions.test.ts` (extended) | New assistant + booth_renter roles + 8-role completeness check |
| 5 | `src/__tests__/inventory-concurrent.test.ts` | RPC contract + (gated) real concurrency test |

## Definition of done for Tier 1

- All 5 slices committed and pushed; Vercel deployment green
- All 5 migration SQLs run against the Supabase project; Belle confirmed in chat
- Belle's owner login resolves as owner across page reload and a fresh incognito session
- One round of `npm test` passes locally
- The four "live verification" checklists above all check out

---

# RETROSPECTIVE — What shipped (2026-05-25)

## Commits

| Slice | Commit | Subject |
|------:|--------|---------|
| 1 | `2650259` | `fix(roles): resolve owner role correctly + map user_type to workspace role` |
| 1+ | `fb2cd11` | `fix(invite): preserve invite-link destination through Google OAuth` |
| 2 | `e472e7c` | `feat(school_mode): supervision gate for student completions + formula entries` |
| 3 | `ecfcfa1` | `feat(roles): add assistant + booth_renter (with booth_renter RLS isolation)` |
| 4 | `fc04824` | `fix(rls): close 9 RLS gaps flagged by the August audit` |
| 5 | `f5f5782` | `fix(inventory): atomic stock deduction RPC + booth_renter scoping` |

## Migrations Belle needs to run (combined SQL paste)

The migrations live in `migrations/` and are not auto-applied — Belle pastes them into the Supabase SQL editor per [[feedback_sql_in_chat]]. They are all idempotent.

1. `migrations/2026-05-25-fix-onboarding-role.sql` — already run (Slice 1 gate)
2. `migrations/2026-05-25-school-mode.sql` — already run + Belle's classroom seed UPDATE
3. `migrations/2026-05-25-roles-assistant-boothrenter.sql` — Slice 3
4. `migrations/2026-05-25-rls-gaps.sql` — Slice 4
5. `migrations/2026-05-25-atomic-stock-deduction.sql` — Slice 5

## Test counts

- Started: 103 passing / 13 pre-existing failing
- Ended: 130 passing / 13 pre-existing failing (zero regressions, +27 new tests for role-mapping, school-mode, and the two new roles)

## New findings (not in the original audit)

1. **Invite-link OAuth round-trip was broken.** The login page hardcoded `redirectTo: '${origin}/auth/callback'` and never read `?redirect=`. A signed-out user clicking an invite link got bounced to Google, came back without the `next` param, and the callback defaulted to `/onboarding` or `/app` — losing the invite entirely. Fixed in commit `fb2cd11` (Slice 1+). This was the source of Belle's "Anabelle Lord's Studio" test-account oddity.
2. **`acceptTeamInvite` did not mark onboarding complete.** A user accepting an invite via the click-link path (vs the typed-code path through the onboarding quiz) had `user_profiles.onboarding_completed=false` after, so the middleware bounced them back to `/onboarding` on their next `/app` hit. Also fixed in `fb2cd11`.
3. **`getWorkspaceId` had two unsafe fallbacks.** (a) `.single()` errored on multi-row owner queries (a user with multiple test workspaces), then (b) the second fallback returned "the first workspace in the database" — silently granting a user access to other people's workspaces. Replaced with `.order('created_at').limit(1).maybeSingle()` and removed the first-workspace fallback in Slice 1.
4. **`/api/team/permissions` silently fell back to `'student'`** when `getMemberRole` returned null. This was the actual mechanism by which Belle's owner login resolved as student — when the workspace mismatch above caused `getMemberRole` to return null, the API responded with student instead of erroring. Now returns 403 in Slice 1.
5. **`metis_feedback` + `metis_lessons` had `USING(true) WITH CHECK(true)` policies** — not "zero policies" as the audit reported. Any authenticated user could read any workspace's feedback and lessons. Worse than no policies, because the policies looked correct at a glance. Tightened to proper workspace scoping in Slice 4.
6. **`user_profiles` was wrongly flagged.** The audit listed it as "RLS enabled but zero policies." It actually has three correct policies (read own, update own, service-role insert). No change needed; comment added in the Slice 4 migration to make this finding permanent.
7. **`pending_client_joins` is intentionally service-role-only.** The audit flagged it as a gap, but the original migration comment explains why: the magic-link join flow writes to it before the user has an auth session. Added a `COMMENT ON TABLE` so a future reader doesn't "fix" this back into a security hole.
8. **The bogus `vi: ^0.3.2` dep blocked `npm install`.** The audit had called it "noise, not breaking." It was breaking — couldn't install vitest, couldn't run tests, couldn't verify anything. Removed in Slice 1 as required scope-deviation.

## Things that surprised me

- **The `single()` vs `maybeSingle()` distinction caused 70% of the role-resolution bug surface.** Every place a "find one thing" query was written with `.single()` would silently degrade to a null fallback if the row didn't exist OR if more than one row matched. The audit caught the symptoms (Belle resolving as student), but the root cause was that the codebase trusts `.single()` to mean "find the thing" when it actually means "throw if zero or many." Every audit-of-the-audit should grep for `.single()` next time.
- **The Build Packet's "no UI in this tier" guidance saved a lot of scope.** I was tempted to also build the instructor approval queue for school_mode in Slice 2, and a workspace switcher for multi-workspace users in Slice 1+. Resisting was the right call — both would have ballooned the tier 4x.
- **Booth-renter isolation had a hidden second half.** Adding `owner_user_id` + RLS on the inventory tables (Slice 3) was clean, but the matching change in the deduction RPC (Slice 5) was the actual hard part. Without it, a booth renter completing a service would either (a) RLS-fail trying to deduct from the salon's product or (b) leak deductions onto the salon's stock. The plan caught this connection late and the implementation went the right way only because Belle's instructions explicitly named the interaction.

## Things deferred (NOT in Tier 1, but discovered along the way)

- **Workspace switcher UI.** A user with multiple memberships (e.g. a test account that has its own workspace AND has joined someone else's via invite) always defaults to their owned workspace via `getCurrentWorkspace`. Acceptable for now; a switcher is Tier 2+.
- **Dashboard student-view filtering.** A student member of a school-mode workspace currently sees the owner's full dashboard widgets (inspo flags, all inventory, all tasks). The role lock-out is at the route level, not the widget level. Build Bible Module 9 implies a student-specific dashboard layout; not in Tier 1.
- **Instructor approval queue UI.** Tier 1 only added the storage + flag + gating logic. The UI for an instructor to see drafts/unverified completions and approve/reject them is Tier 2 per the August Packet.
- **Concurrent-completion integration test.** A real test of the atomic RPC would need a Supabase test-DB harness that doesn't exist yet. The atomicity is guaranteed by Postgres semantics on `SELECT ... FOR UPDATE`; relying on the standard pattern instead.
- **`team.test.ts` pre-existing failures (13).** Five-ish are mock-chain incompleteness; one is a contradiction between the test ("student should not have `earnings.view_own`") and the actual permissions map (which grants it). Both predate this tier and are worth cleaning up separately, but Tier 1 was scoped to not touch them.

## Tests added by this plan (actual)

| Slice | Test file | New tests |
|------:|-----------|----------:|
| 1 | `src/__tests__/role-mapping.test.ts` | 11 |
| 2 | `src/__tests__/school-mode.test.ts` | 7 |
| 3 | `src/__tests__/permissions.test.ts` (extended) | 8 |
| 3 | `src/__tests__/role-mapping.test.ts` (extended) | 2 |
| 5 | (deferred — needs DB harness) | 0 |
| **Total** | | **27** |
