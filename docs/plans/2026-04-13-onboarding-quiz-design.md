# Onboarding Quiz Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route new users to the correct account type (student, practitioner, salon owner, school admin) via an onboarding quiz instead of defaulting everyone to owner.

**Architecture:** New `user_profiles` table tracks onboarding state and user_type. Top-level `/onboarding` route with client-side state machine. Auth callback creates profile row instead of auto-creating workspace. Middleware redirects un-onboarded users. API endpoint handles workspace creation based on quiz result.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + RLS), Tailwind CSS 4, TypeScript, existing UI components (Button, Input)

---

### Task 1: Database Migration — `user_profiles` table

**Files:**
- Create: `migrations/2026-04-13-onboarding-user-profiles.sql`

**Step 1: Write the migration SQL**

```sql
-- Onboarding: user_profiles table
-- Tracks onboarding completion and user type for routing

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(30) DEFAULT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Backfill: mark existing workspace owners as onboarded
INSERT INTO user_profiles (user_id, user_type, onboarding_completed)
SELECT w.owner_id, 'practitioner', true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = w.owner_id
);

-- Backfill: mark existing workspace members as onboarded
INSERT INTO user_profiles (user_id, user_type, onboarding_completed)
SELECT wm.user_id,
  CASE wm.role
    WHEN 'student' THEN 'student'
    WHEN 'instructor' THEN 'practitioner'
    ELSE 'practitioner'
  END,
  true
FROM workspace_members wm
WHERE wm.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = wm.user_id
  );

-- Index for fast middleware lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

**Step 2: Run migration in Supabase dashboard**

Go to Supabase SQL Editor, paste and run the migration. Verify:
- Table created with correct columns
- RLS policies active
- Existing users backfilled with `onboarding_completed = true`

**Step 3: Commit**

```bash
git add migrations/2026-04-13-onboarding-user-profiles.sql
git commit -m "feat: add user_profiles table for onboarding quiz routing"
```

---

### Task 2: Types and DB helper — `user-profiles.ts`

**Files:**
- Modify: `src/lib/types.ts` (add UserProfile type near line 946, before TeamRole)
- Create: `src/lib/db/user-profiles.ts`

**Step 1: Add UserProfile type to types.ts**

Add after the `// ── Team Management` comment (around line 944), before `TeamRole`:

```typescript
// ── User Profiles (Onboarding) ──────────────────────────────

export type UserType = 'student' | 'practitioner' | 'salon_owner' | 'school_admin';

export type UserProfile = {
  id: string;
  userId: string;
  userType: UserType | null;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type UserProfileRow = {
  id: string;
  user_id: string;
  user_type: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

export function userProfileRowToModel(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    userType: row.user_type as UserType | null,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
  };
}
```

**Step 2: Create the DB helper**

Create `src/lib/db/user-profiles.ts`:

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserProfile, UserProfileRow, UserType } from "@/lib/types";
import { userProfileRowToModel } from "@/lib/types";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return userProfileRowToModel(data as UserProfileRow);
}

export async function createUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[user-profiles] createUserProfile error:", error?.message);
    return null;
  }
  return userProfileRowToModel(data as UserProfileRow);
}

export async function completeOnboarding(
  userId: string,
  userType: UserType,
): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update({ user_type: userType, onboarding_completed: true })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[user-profiles] completeOnboarding error:", error?.message);
    return null;
  }
  return userProfileRowToModel(data as UserProfileRow);
}

export async function getOnboardingStatus(userId: string): Promise<{
  onboardingCompleted: boolean;
  userType: UserType | null;
}> {
  const profile = await getUserProfile(userId);
  return {
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    userType: profile?.userType ?? null,
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/db/user-profiles.ts
git commit -m "feat: add UserProfile type and db helpers for onboarding"
```

---

### Task 3: Auth callback — stop auto-creating workspaces

**Files:**
- Modify: `src/app/auth/callback/route.ts`

**Step 1: Rewrite auth callback**

Replace the entire file content with:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfile, createUserProfile } from "@/lib/db/user-profiles";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Ensure user_profiles row exists
        const profile = await getUserProfile(user.id);

        if (!profile) {
          // New user — create profile, send to onboarding
          await createUserProfile(user.id);
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        if (!profile.onboardingCompleted) {
          // Returning user who hasn't finished onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        // Onboarded user — send to their destination
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

**Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: auth callback creates user profile instead of auto-creating workspace"
```

---

### Task 4: Middleware — redirect un-onboarded users

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Update middleware to check onboarding status**

Replace the entire file with:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Protected routes for stylists
  if (pathname.startsWith("/app")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Check onboarding status — use admin client for RLS bypass
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile } = await admin
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || !profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Onboarding page — require auth but allow un-onboarded
  if (pathname.startsWith("/onboarding")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", "/onboarding");
      return NextResponse.redirect(url);
    }
  }

  // Client portal — /client/join, /client/login, /client/auth are public
  const clientPublicPaths = ["/client/join", "/client/login", "/client/auth"];
  const isClientPublic = clientPublicPaths.some(p => pathname.startsWith(p));

  if (pathname.startsWith("/client") && !isClientPublic) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/client/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && user) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const url = request.nextUrl.clone();
    url.pathname = redirect || "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware redirects un-onboarded users to /onboarding"
```

---

### Task 5: API — `/api/onboarding/complete` and `/api/onboarding/status`

**Files:**
- Create: `src/app/api/onboarding/complete/route.ts`
- Create: `src/app/api/onboarding/status/route.ts`

**Step 1: Create the complete endpoint**

`src/app/api/onboarding/complete/route.ts`:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { completeOnboarding } from "@/lib/db/user-profiles";
import { acceptTeamInvite } from "@/lib/db/team";
import { NextResponse } from "next/server";
import type { UserType } from "@/lib/types";

const VALID_TYPES: UserType[] = ["student", "practitioner", "salon_owner", "school_admin"];

function getRedirectPath(userType: UserType, joinedViaInvite: boolean): string {
  switch (userType) {
    case "student":
      return "/app/calla";
    case "school_admin":
      return "/app/floor";
    case "practitioner":
    case "salon_owner":
    default:
      return "/app/dashboard";
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { user_type, invite_token } = body as {
    user_type: string;
    invite_token?: string;
  };

  if (!VALID_TYPES.includes(user_type as UserType)) {
    return NextResponse.json({ error: "Invalid user_type" }, { status: 400 });
  }

  const userType = user_type as UserType;
  const admin = createSupabaseAdminClient();
  let joinedViaInvite = false;

  // Handle invite code if provided
  if (invite_token) {
    const displayName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Team Member";

    const { member, error } = await acceptTeamInvite(
      invite_token,
      user.id,
      displayName,
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    joinedViaInvite = true;
  }

  // Create workspace if user didn't join via invite
  if (!joinedViaInvite) {
    const name =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "My Workspace";

    // Check if user already has a workspace (edge case)
    const { data: existingWs } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existingWs) {
      // Generate unique stylist code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let stylistCode = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        let candidate = "";
        for (let i = 0; i < 6; i++) {
          candidate += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const { data } = await admin
          .from("workspaces")
          .select("id")
          .eq("stylist_code", candidate)
          .maybeSingle();
        if (!data) {
          stylistCode = candidate;
          break;
        }
      }

      const workspaceName =
        userType === "school_admin"
          ? `${name}'s School`
          : userType === "salon_owner"
            ? `${name}'s Salon`
            : `${name}'s Studio`;

      const { data: ws, error: wsError } = await admin
        .from("workspaces")
        .insert({
          owner_id: user.id,
          name: workspaceName,
          stylist_code: stylistCode,
          is_salon: userType === "salon_owner" || userType === "school_admin",
        })
        .select("id")
        .single();

      if (wsError) {
        console.error("[onboarding/complete] workspace creation error:", wsError.message);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
      }

      // Create workspace_members entry for owner
      await admin
        .from("workspace_members")
        .insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });
    }
  }

  // Mark onboarding complete
  const profile = await completeOnboarding(user.id, userType);
  if (!profile) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  const redirect = getRedirectPath(userType, joinedViaInvite);
  return NextResponse.json({ redirect, user_type: userType });
}
```

**Step 2: Create the status endpoint**

`src/app/api/onboarding/status/route.ts`:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/db/user-profiles";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getOnboardingStatus(user.id);
  return NextResponse.json(status);
}
```

**Step 3: Commit**

```bash
git add src/app/api/onboarding/complete/route.ts src/app/api/onboarding/status/route.ts
git commit -m "feat: add onboarding complete and status API endpoints"
```

---

### Task 6: Onboarding UI — Layout and Progress components

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/onboarding/_components/OnboardingLayout.tsx`
- Create: `src/app/onboarding/_components/OnboardingProgress.tsx`

**Step 1: Create OnboardingProgress**

`src/app/onboarding/_components/OnboardingProgress.tsx`:

```tsx
"use client";

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === currentStep ? 24 : 8,
            height: 8,
            background:
              i <= currentStep
                ? "var(--brass)"
                : "var(--stone-deep)",
          }}
        />
      ))}
    </div>
  );
}
```

**Step 2: Create OnboardingLayout**

`src/app/onboarding/_components/OnboardingLayout.tsx`:

```tsx
"use client";

import { OnboardingProgress } from "./OnboardingProgress";

export function OnboardingLayout({
  currentStep,
  totalSteps,
  children,
}: {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--stone-lightest)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-light tracking-wide"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--olive)",
            }}
          >
            Opelle
          </h1>
        </div>

        <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />

        <div
          className="rounded-lg p-8"
          style={{
            background: "white",
            border: "1px solid var(--stone-mid)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create the page.tsx stub** (will be completed in Task 7)

`src/app/onboarding/page.tsx`:

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/db/user-profiles";
import { OnboardingQuiz } from "./_components/OnboardingQuiz";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);

  if (profile?.onboardingCompleted) {
    // Already onboarded — redirect to appropriate page
    switch (profile.userType) {
      case "student":
        redirect("/app/calla");
      case "school_admin":
        redirect("/app/floor");
      default:
        redirect("/app/dashboard");
    }
  }

  return <OnboardingQuiz />;
}
```

**Step 4: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: add onboarding layout, progress, and page shell"
```

---

### Task 7: Onboarding UI — Quiz screens and state machine

**Files:**
- Create: `src/app/onboarding/_components/OnboardingQuiz.tsx`
- Create: `src/app/onboarding/_components/OnboardingWelcome.tsx`
- Create: `src/app/onboarding/_components/OnboardingStylistFollowup.tsx`
- Create: `src/app/onboarding/_components/OnboardingStudentFollowup.tsx`
- Create: `src/app/onboarding/_components/OnboardingInviteCode.tsx`

**Step 1: Create OnboardingWelcome**

`src/app/onboarding/_components/OnboardingWelcome.tsx`:

```tsx
"use client";

type WelcomeChoice = "student" | "stylist" | "salon_owner" | "school_admin";

const OPTIONS: { value: WelcomeChoice; label: string; description: string }[] = [
  {
    value: "student",
    label: "I'm a cosmetology student",
    description: "Learning and building your skills",
  },
  {
    value: "stylist",
    label: "I'm a licensed stylist",
    description: "Working behind the chair",
  },
  {
    value: "salon_owner",
    label: "I own or manage a salon",
    description: "Running a salon business",
  },
  {
    value: "school_admin",
    label: "I run a cosmetology school",
    description: "Training the next generation",
  },
];

export function OnboardingWelcome({
  onSelect,
}: {
  onSelect: (choice: WelcomeChoice) => void;
}) {
  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        Welcome to Opelle
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        Let&apos;s get you set up. Which best describes you?
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--stone-lightest)",
              border: "1px solid var(--stone-mid)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brass)";
              e.currentTarget.style.background = "var(--brass-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--stone-mid)";
              e.currentTarget.style.background = "var(--stone-lightest)";
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-on-stone)" }}
            >
              {opt.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              {opt.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create OnboardingStylistFollowup**

`src/app/onboarding/_components/OnboardingStylistFollowup.tsx`:

```tsx
"use client";

type StylistChoice = "independent" | "employee" | "salon_owner";

const OPTIONS: { value: StylistChoice; label: string; description: string }[] = [
  {
    value: "independent",
    label: "I rent a booth or work independently",
    description: "Solo practitioner, your own clients",
  },
  {
    value: "employee",
    label: "I work at a salon (employee)",
    description: "Part of an existing team",
  },
  {
    value: "salon_owner",
    label: "I own my own salon",
    description: "Running your own business",
  },
];

export function OnboardingStylistFollowup({
  onSelect,
  onBack,
}: {
  onSelect: (choice: StylistChoice) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        How do you work?
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        This helps us set up the right tools for you.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--stone-lightest)",
              border: "1px solid var(--stone-mid)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brass)";
              e.currentTarget.style.background = "var(--brass-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--stone-mid)";
              e.currentTarget.style.background = "var(--stone-lightest)";
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-on-stone)" }}
            >
              {opt.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              {opt.description}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-xs w-full text-center"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}
```

**Step 3: Create OnboardingStudentFollowup**

`src/app/onboarding/_components/OnboardingStudentFollowup.tsx`:

```tsx
"use client";

type StudentChoice = "invited" | "solo";

const OPTIONS: { value: StudentChoice; label: string; description: string }[] = [
  {
    value: "invited",
    label: "My school invited me",
    description: "I have an invite code from my school",
  },
  {
    value: "solo",
    label: "I want to use Opelle for myself",
    description: "Personal practice and learning",
  },
];

export function OnboardingStudentFollowup({
  onSelect,
  onBack,
}: {
  onSelect: (choice: StudentChoice) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        Are you joining an existing school?
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        This determines how we set up your account.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--stone-lightest)",
              border: "1px solid var(--stone-mid)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brass)";
              e.currentTarget.style.background = "var(--brass-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--stone-mid)";
              e.currentTarget.style.background = "var(--stone-lightest)";
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-on-stone)" }}
            >
              {opt.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              {opt.description}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-xs w-full text-center"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}
```

**Step 4: Create OnboardingInviteCode**

`src/app/onboarding/_components/OnboardingInviteCode.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function OnboardingInviteCode({
  context,
  onSubmit,
  onSkip,
  onBack,
}: {
  context: "student" | "employee";
  onSubmit: (code: string) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError("Please enter a valid invite code");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        Enter your invite code
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        {context === "student"
          ? "Your school should have given you a code to join."
          : "Ask your salon manager for the team invite code."}
      </p>

      <div className="mb-4">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="e.g. ABCD1234"
          maxLength={10}
          className="w-full rounded-lg p-3 text-center text-lg tracking-widest font-mono"
          style={{
            background: "var(--stone-lightest)",
            border: error
              ? "1px solid var(--garnet)"
              : "1px solid var(--stone-mid)",
            fontFamily: "'DM Sans', sans-serif",
            color: "var(--text-on-stone)",
            outline: "none",
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--brass)";
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--stone-mid)";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        {error && (
          <p
            className="text-xs mt-2"
            style={{ color: "var(--garnet)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {error}
          </p>
        )}
      </div>

      <Button onClick={handleSubmit} className="w-full" size="lg">
        Join
      </Button>

      <button
        onClick={onSkip}
        className="mt-3 text-xs w-full text-center underline"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        Don&apos;t have a code? Continue without one
      </button>

      <button
        onClick={onBack}
        className="mt-2 text-xs w-full text-center"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}
```

**Step 5: Create OnboardingQuiz (state machine)**

`src/app/onboarding/_components/OnboardingQuiz.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "./OnboardingLayout";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingStylistFollowup } from "./OnboardingStylistFollowup";
import { OnboardingStudentFollowup } from "./OnboardingStudentFollowup";
import { OnboardingInviteCode } from "./OnboardingInviteCode";

type Screen = "welcome" | "stylist_followup" | "student_followup" | "invite_code";

type QuizState = {
  screen: Screen;
  userType: string | null;
  inviteContext: "student" | "employee" | null;
};

export function OnboardingQuiz() {
  const router = useRouter();
  const [state, setState] = useState<QuizState>({
    screen: "welcome",
    userType: null,
    inviteContext: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepIndex =
    state.screen === "welcome"
      ? 0
      : state.screen === "invite_code"
        ? 2
        : 1;

  const totalSteps = state.inviteContext ? 3 : 2;

  async function completeOnboarding(userType: string, inviteToken?: string) {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_type: userType, invite_token: inviteToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      router.push(data.redirect);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <OnboardingLayout currentStep={totalSteps - 1} totalSteps={totalSteps}>
        <div className="text-center py-8">
          <div
            className="text-lg font-normal mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--olive)",
            }}
          >
            Setting up your account...
          </div>
          <div
            className="text-sm"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "var(--text-on-stone-faint)",
            }}
          >
            This will only take a moment.
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={stepIndex} totalSteps={totalSteps}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: "var(--garnet-wash)",
            color: "var(--garnet)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </div>
      )}

      {state.screen === "welcome" && (
        <OnboardingWelcome
          onSelect={(choice) => {
            if (choice === "student") {
              setState({ screen: "student_followup", userType: "student", inviteContext: null });
            } else if (choice === "stylist") {
              setState({ screen: "stylist_followup", userType: null, inviteContext: null });
            } else if (choice === "salon_owner") {
              completeOnboarding("salon_owner");
            } else if (choice === "school_admin") {
              completeOnboarding("school_admin");
            }
          }}
        />
      )}

      {state.screen === "stylist_followup" && (
        <OnboardingStylistFollowup
          onSelect={(choice) => {
            if (choice === "independent") {
              completeOnboarding("practitioner");
            } else if (choice === "employee") {
              setState({
                screen: "invite_code",
                userType: "practitioner",
                inviteContext: "employee",
              });
            } else if (choice === "salon_owner") {
              completeOnboarding("salon_owner");
            }
          }}
          onBack={() =>
            setState({ screen: "welcome", userType: null, inviteContext: null })
          }
        />
      )}

      {state.screen === "student_followup" && (
        <OnboardingStudentFollowup
          onSelect={(choice) => {
            if (choice === "invited") {
              setState({
                screen: "invite_code",
                userType: "student",
                inviteContext: "student",
              });
            } else {
              completeOnboarding("student");
            }
          }}
          onBack={() =>
            setState({ screen: "welcome", userType: null, inviteContext: null })
          }
        />
      )}

      {state.screen === "invite_code" && state.inviteContext && (
        <OnboardingInviteCode
          context={state.inviteContext}
          onSubmit={(code) => {
            completeOnboarding(state.userType || "practitioner", code);
          }}
          onSkip={() => {
            completeOnboarding(state.userType || "practitioner");
          }}
          onBack={() => {
            if (state.inviteContext === "student") {
              setState({ screen: "student_followup", userType: "student", inviteContext: null });
            } else {
              setState({ screen: "stylist_followup", userType: null, inviteContext: null });
            }
          }}
        />
      )}
    </OnboardingLayout>
  );
}
```

**Step 6: Commit**

```bash
git add src/app/onboarding/_components/
git commit -m "feat: add onboarding quiz UI with state machine and all screens"
```

---

### Task 8: Verify and push

**Step 1: Run the dev server and check for build errors**

```bash
cd opelle-app-github && npm run build
```

Fix any TypeScript or build errors.

**Step 2: Manual test checklist**

- [ ] New user signs in with Google → lands on `/onboarding` (not `/app`)
- [ ] Selecting "cosmetology student" → shows student follow-up
- [ ] Selecting "licensed stylist" → shows stylist follow-up
- [ ] Selecting "salon owner" → completes, creates workspace, redirects to `/app/dashboard`
- [ ] Selecting "school admin" → completes, creates workspace, redirects to `/app/floor`
- [ ] Student "use for myself" → completes, redirects to `/app/calla`
- [ ] Student "school invited me" → shows invite code screen
- [ ] Stylist "booth renter" → completes as practitioner → `/app/dashboard`
- [ ] Stylist "salon employee" → shows invite code screen
- [ ] Valid invite code → joins workspace, redirects
- [ ] Invalid invite code → shows error
- [ ] "Continue without code" → creates solo workspace
- [ ] Back buttons work on all screens
- [ ] Existing users (already onboarded) → skip straight to dashboard
- [ ] Progress dots update correctly

**Step 3: Push to GitHub**

```bash
git push origin main
```

Vercel auto-deploys from push.
