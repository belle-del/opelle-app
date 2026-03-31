# Before/After Photo Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface before/after photos across three new areas: a "Photos" tab on client detail pages, outcome thumbnails/detail on formula entries, and a stylist portfolio page (internal + public).

**Architecture:** Option A — surface-specific queries against `service_completions` and `formula_history`. One small migration adds `portfolio_public` to workspaces. Three reusable components (`PhotoPairCard`, `BeforeAfterGallery`, `BeforeAfterModal`) are built once and shared across all surfaces. Four new API endpoints handle the data. No new FK between `formula_entries` and `formula_history` — loose join by client_id + service_date proximity.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (Postgres + Auth). No test framework — verify with `npx tsc --noEmit` and `npm run lint`. All routes use `createSupabaseServerClient()` for auth + `createSupabaseAdminClient()` with explicit `workspace_id` guard for queries.

---

## Task 1: Migration — add portfolio_public to workspaces

**Files:**
- Create: `migrations/2026-03-31-portfolio-public.sql`

**Step 1: Create the migration file**

```sql
-- Migration: add portfolio_public to workspaces
-- Date: 2026-03-31

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT false;
```

**Step 2: Apply in Supabase**

Run this SQL in the Supabase Dashboard SQL editor (Project → SQL Editor → New query). Paste the migration content and click Run.

Expected: `ALTER TABLE` success with no errors.

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add migrations/2026-03-31-portfolio-public.sql
git commit -m "feat: add portfolio_public column to workspaces"
```

---

## Task 2: Add PhotoPair type to types.ts

**Files:**
- Modify: `src/lib/types.ts`

This is the shared data shape used by all gallery components and API responses. It must be defined before any component or API is written.

**Step 1: Add PhotoPair type**

Open `src/lib/types.ts`. Find the `// Photo` section (around line 259). After the existing `Photo` type and before `// Formula History`, insert:

```ts
// PhotoPair — shared shape for before/after gallery components
export type PhotoPair = {
  id: string;              // service_completion id
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  completedAt: string;
  categoryName: string;
  studentName?: string;    // omitted on public portfolio
  notes?: string;
};
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add PhotoPair type to types.ts"
```

---

## Task 3: API — GET /api/clients/[id]/photos

**Files:**
- Create: `src/app/api/clients/[id]/photos/route.ts`

**Step 1: Create the route file**

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import type { PhotoPair } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("service_completions")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        completed_at,
        student_name,
        notes,
        service_categories ( name )
      `)
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[clients/photos] query error:", error.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const pairs: PhotoPair[] = (data ?? []).map((row: {
      id: string;
      before_photo_url: string | null;
      after_photo_url: string | null;
      completed_at: string;
      student_name: string | null;
      notes: string | null;
      service_categories: { name: string } | null;
    }) => ({
      id: row.id,
      beforePhotoUrl: row.before_photo_url,
      afterPhotoUrl: row.after_photo_url,
      completedAt: row.completed_at,
      categoryName: row.service_categories?.name ?? "Service",
      studentName: row.student_name ?? undefined,
      notes: row.notes ?? undefined,
    }));

    return NextResponse.json({ pairs });
  } catch (err) {
    console.error("[clients/photos] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 3: Commit**

```bash
git add src/app/api/clients/[id]/photos/route.ts
git commit -m "feat: add GET /api/clients/[id]/photos endpoint"
```

---

## Task 4: API — GET /api/formula-entries/[id]/photos

**Files:**
- Create: `src/app/api/formula-entries/[id]/photos/route.ts`

This endpoint does a loose join: given a `formula_entry` id, look up that entry's `client_id` + `service_date`, then find the closest `formula_history` record within ±1 day that has photos.

**Step 1: Create the route file**

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const admin = createSupabaseAdminClient();

    // Fetch the formula entry to get client_id and service_date
    const { data: entry, error: entryError } = await admin
      .from("formula_entries")
      .select("id, client_id, service_date")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(null);
    }

    // Find closest formula_history record with photos within ±1 day
    const serviceDate = new Date(entry.service_date);
    const dayBefore = new Date(serviceDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(serviceDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { data: historyRows } = await admin
      .from("formula_history")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        result_notes,
        client_satisfaction,
        created_at,
        service_completion_id
      `)
      .eq("workspace_id", workspaceId)
      .eq("client_id", entry.client_id)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .gte("created_at", dayBefore.toISOString())
      .lte("created_at", dayAfter.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!historyRows || historyRows.length === 0) {
      return NextResponse.json(null);
    }

    // Pick closest to service_date
    const best = historyRows.reduce((closest: typeof historyRows[0], row: typeof historyRows[0]) => {
      const closestDiff = Math.abs(new Date(closest.created_at).getTime() - serviceDate.getTime());
      const rowDiff = Math.abs(new Date(row.created_at).getTime() - serviceDate.getTime());
      return rowDiff < closestDiff ? row : closest;
    });

    return NextResponse.json({
      beforePhotoUrl: best.before_photo_url,
      afterPhotoUrl: best.after_photo_url,
      resultNotes: best.result_notes,
      clientSatisfaction: best.client_satisfaction,
      completedAt: best.created_at,
    });
  } catch (err) {
    console.error("[formula-entries/photos] unexpected error:", err);
    return NextResponse.json(null);
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 3: Commit**

```bash
git add src/app/api/formula-entries/[id]/photos/route.ts
git commit -m "feat: add GET /api/formula-entries/[id]/photos endpoint"
```

---

## Task 5: API — GET /api/portfolio/[userId] + PATCH /api/settings/portfolio

**Files:**
- Create: `src/app/api/portfolio/[userId]/route.ts`
- Create: `src/app/api/settings/portfolio/route.ts`

**Step 1: Create the portfolio GET endpoint**

This is dual-mode: authenticated users with a valid session can see their own portfolio regardless of `portfolio_public`. Unauthenticated visitors can only see it if `portfolio_public = true`. Both paths use the admin client to query.

```ts
// src/app/api/portfolio/[userId]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PhotoPair } from "@/lib/types";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const admin = createSupabaseAdminClient();

    // Resolve workspace for this userId (they must be the owner)
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id, name, portfolio_public, owner_id")
      .eq("owner_id", userId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check auth — authenticated owner can always see; others need portfolio_public
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user?.id === workspace.owner_id;

    if (!workspace.portfolio_public && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch stylist display name from user metadata
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const stylistName = authUser?.user?.user_metadata?.full_name
      || authUser?.user?.email?.split("@")[0]
      || "Stylist";

    // Query photos
    const { data, error } = await admin
      .from("service_completions")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        completed_at,
        notes,
        service_categories ( name )
      `)
      .eq("workspace_id", workspace.id)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[portfolio] query error:", error.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const pairs: PhotoPair[] = (data ?? []).map((row: {
      id: string;
      before_photo_url: string | null;
      after_photo_url: string | null;
      completed_at: string;
      notes: string | null;
      service_categories: { name: string } | null;
    }) => ({
      id: row.id,
      beforePhotoUrl: row.before_photo_url,
      afterPhotoUrl: row.after_photo_url,
      completedAt: row.completed_at,
      categoryName: row.service_categories?.name ?? "Service",
      // No studentName or notes on public portfolio
    }));

    return NextResponse.json({
      pairs,
      stylistName,
      workspaceName: workspace.name,
      portfolioPublic: workspace.portfolio_public,
    });
  } catch (err) {
    console.error("[portfolio] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 2: Create the portfolio settings PATCH endpoint**

```ts
// src/app/api/settings/portfolio/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const body = await request.json();
    const { portfolioPublic } = body;

    if (typeof portfolioPublic !== "boolean") {
      return NextResponse.json({ error: "portfolioPublic must be boolean" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("workspaces")
      .update({ portfolio_public: portfolioPublic })
      .eq("id", workspaceId);

    if (error) {
      console.error("[settings/portfolio] update error:", error.message);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, portfolioPublic });
  } catch (err) {
    console.error("[settings/portfolio] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 4: Commit**

```bash
git add src/app/api/portfolio/[userId]/route.ts src/app/api/settings/portfolio/route.ts
git commit -m "feat: add portfolio GET + settings/portfolio PATCH endpoints"
```

---

## Task 6: Reusable components — PhotoPairCard, BeforeAfterGallery, BeforeAfterModal

**Files:**
- Create: `src/components/PhotoPairCard.tsx`
- Create: `src/components/BeforeAfterGallery.tsx`
- Create: `src/components/BeforeAfterModal.tsx`

Build these in dependency order: Card first (used by Gallery), Modal last (depends on Card's PhotoPair type).

**Step 1: Create PhotoPairCard**

```tsx
// src/components/PhotoPairCard.tsx
"use client";

import type { PhotoPair } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = {
  pair: PhotoPair;
  onClick: () => void;
};

export function PhotoPairCard({ pair, onClick }: Props) {
  const primaryUrl = pair.afterPhotoUrl || pair.beforePhotoUrl;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--stone-dark, #2C2C24)",
        border: "1px solid rgba(196,171,112,0.1)",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Primary (after) photo */}
      <div style={{ aspectRatio: "4/3", position: "relative", background: "#1A1A14" }}>
        {primaryUrl ? (
          <img
            src={primaryUrl}
            alt={pair.afterPhotoUrl ? "After photo" : "Before photo"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(196,171,112,0.3)", fontSize: "12px",
          }}>
            No photo
          </div>
        )}

        {/* Before overlay — bottom-left, 25% width */}
        {pair.beforePhotoUrl && pair.afterPhotoUrl && (
          <div style={{
            position: "absolute", bottom: "8px", left: "8px",
            width: "25%", aspectRatio: "4/3",
            borderRadius: "6px", overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            <img
              src={pair.beforePhotoUrl}
              alt="Before photo"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--brass, #C4AB70)",
            padding: "2px 8px", borderRadius: "100px",
            border: "1px solid rgba(196,171,112,0.2)",
          }}>
            {pair.categoryName}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(241,239,224,0.4)" }}>
            {formatDate(pair.completedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create BeforeAfterGallery**

```tsx
// src/components/BeforeAfterGallery.tsx
"use client";

import { useState } from "react";
import type { PhotoPair } from "@/lib/types";
import { PhotoPairCard } from "./PhotoPairCard";
import { BeforeAfterModal } from "./BeforeAfterModal";

type Props = {
  pairs: PhotoPair[];
  emptyMessage?: string;
};

export function BeforeAfterGallery({
  pairs,
  emptyMessage = "No photos yet.",
}: Props) {
  const [selectedPair, setSelectedPair] = useState<PhotoPair | null>(null);

  if (pairs.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "48px 24px",
        color: "rgba(241,239,224,0.4)", fontSize: "14px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "16px",
      }}>
        {pairs.map((pair) => (
          <PhotoPairCard
            key={pair.id}
            pair={pair}
            onClick={() => setSelectedPair(pair)}
          />
        ))}
      </div>

      {selectedPair && (
        <BeforeAfterModal
          pair={selectedPair}
          onClose={() => setSelectedPair(null)}
        />
      )}
    </>
  );
}
```

**Step 3: Create BeforeAfterModal**

```tsx
// src/components/BeforeAfterModal.tsx
"use client";

import { useEffect } from "react";
import type { PhotoPair } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = {
  pair: PhotoPair;
  onClose: () => void;
};

export function BeforeAfterModal({ pair, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--stone-dark, #2C2C24)",
          borderRadius: "16px",
          border: "1px solid rgba(196,171,112,0.15)",
          maxWidth: "800px",
          width: "100%",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(196,171,112,0.1)",
        }}>
          <div>
            <span style={{
              fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--brass, #C4AB70)",
            }}>
              {pair.categoryName}
            </span>
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.4)", marginTop: "2px" }}>
              {formatDate(pair.completedAt)}
              {pair.studentName && ` · ${pair.studentName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(241,239,224,0.06)", border: "none", color: "rgba(241,239,224,0.5)",
              borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer",
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Photos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
          {["before", "after"].map((side) => {
            const url = side === "before" ? pair.beforePhotoUrl : pair.afterPhotoUrl;
            return (
              <div key={side}>
                <p style={{
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "rgba(196,171,112,0.7)", padding: "8px 12px 4px",
                }}>
                  {side}
                </p>
                <div style={{ aspectRatio: "3/4", background: "#1A1A14" }}>
                  {url ? (
                    <img
                      src={url}
                      alt={`${side} photo`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(196,171,112,0.3)", fontSize: "13px",
                    }}>
                      No {side} photo
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {pair.notes && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(196,171,112,0.1)" }}>
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", fontStyle: "italic" }}>
              {pair.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

**Step 5: Commit**

```bash
git add src/components/PhotoPairCard.tsx src/components/BeforeAfterGallery.tsx src/components/BeforeAfterModal.tsx
git commit -m "feat: add PhotoPairCard, BeforeAfterGallery, BeforeAfterModal components"
```

---

## Task 7: Photos tab in ClientDetailTabs

**Files:**
- Modify: `src/app/app/clients/[id]/_components/ClientDetailTabs.tsx`

Add a "Photos" tab between "Formulas" and "History". The tab fetches from `/api/clients/[id]/photos` on first activation (lazy load — don't fetch until the user clicks the tab).

**Step 1: Add photo state and lazy-fetch logic**

Open `ClientDetailTabs.tsx`. The existing state block has `activeTab`, `inspoSubmissions`, `inspoLoaded`, `unreviewedCount`. Add after those:

```ts
const [photoPairs, setPhotoPairs] = useState<import("@/lib/types").PhotoPair[]>([]);
const [photosLoaded, setPhotosLoaded] = useState(false);
const [photosLoading, setPhotosLoading] = useState(false);
```

Then add a `useEffect` that triggers when `activeTab === "photos"` and `!photosLoaded`:

```ts
useEffect(() => {
  if (activeTab !== "photos" || photosLoaded) return;
  setPhotosLoading(true);
  fetch(`/api/clients/${clientId}/photos`)
    .then((res) => res.json())
    .then((data) => {
      if (data.pairs && Array.isArray(data.pairs)) {
        setPhotoPairs(data.pairs);
      }
    })
    .catch(() => {})
    .finally(() => {
      setPhotosLoaded(true);
      setPhotosLoading(false);
    });
}, [activeTab, clientId, photosLoaded]);
```

**Step 2: Add "photos" to the activeTab type union**

Find:
```ts
const [activeTab, setActiveTab] = useState<"formulas" | "inspo" | "messages" | "history">("formulas");
```
Replace with:
```ts
const [activeTab, setActiveTab] = useState<"formulas" | "photos" | "inspo" | "messages" | "history">("formulas");
```

**Step 3: Add "Photos" to the tabs array**

Find the `tabs` array. It currently has `formulas`, `history`, `inspo`, `messages`. Change it to insert "Photos" after "Formulas":

```ts
const tabs = [
  { id: "formulas" as const, label: "Formulas" },
  { id: "photos" as const, label: "Photos" },
  { id: "history" as const, label: "History" },
  {
    id: "inspo" as const,
    label: "Inspo",
    badge: unreviewedCount > 0 ? unreviewedCount : undefined,
  },
  {
    id: "messages" as const,
    label: "Messages",
    badge: unreadMessages > 0 ? unreadMessages : undefined,
  },
];
```

**Step 4: Add the Photos tab content block**

Find the section with tab content renders. After `{activeTab === "formulas" && children}`, add:

```tsx
{activeTab === "photos" && (
  photosLoading ? (
    <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "14px" }}>
      Loading photos…
    </div>
  ) : (
    <BeforeAfterGallery
      pairs={photoPairs}
      emptyMessage="No photos yet — photos from color and chemical services appear here after completion."
    />
  )
)}
```

**Step 5: Add the import at the top of the file**

After existing imports, add:
```ts
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
```

**Step 6: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 7: Commit**

```bash
git add src/app/app/clients/[id]/_components/ClientDetailTabs.tsx
git commit -m "feat: add Photos tab to ClientDetailTabs"
```

---

## Task 8: Formula list thumbnail + formula detail page

**Files:**
- Modify: `src/app/app/formulas/page.tsx`
- Create: `src/app/app/formulas/[id]/page.tsx`

### Part A: After-photo thumbnail on formula list cards

**Step 1: Fetch photo for each entry**

The formula list already fetches all entries. We'll fetch photo data for each entry lazily: after entries load, fire one request per entry to `/api/formula-entries/[id]/photos` and store results in a map.

In `FormulasPage`, add state after the existing state declarations:
```ts
const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map()); // entryId → afterPhotoUrl
```

Add a `useEffect` that runs when `entries` changes — fire requests for all entries in parallel:
```ts
useEffect(() => {
  if (entries.length === 0) return;
  let cancelled = false;
  Promise.all(
    entries.map((e) =>
      fetch(`/api/formula-entries/${e.id}/photos`)
        .then((r) => r.json())
        .then((data) => ({ id: e.id, url: data?.afterPhotoUrl as string | null ?? null }))
        .catch(() => ({ id: e.id, url: null }))
    )
  ).then((results) => {
    if (cancelled) return;
    const map = new Map<string, string>();
    for (const { id, url } of results) {
      if (url) map.set(id, url);
    }
    setPhotoMap(map);
  });
  return () => { cancelled = true; };
}, [entries]);
```

**Step 2: Pass photoMap into FormulaCard**

The `FormulaCard` component is defined in the same file. Change its props type:
```ts
function FormulaCard({ entry, search, clientNames, serviceTypeNames, afterPhotoUrl }: {
  entry: FormulaEntry;
  search: string;
  clientNames: Map<string, string>;
  serviceTypeNames: Map<string, string>;
  afterPhotoUrl?: string;
})
```

Add a thumbnail to the `FormulaCard` JSX. Inside the outer `<Card>`, find the top `<div>` with `justifyContent: "space-between"`. Modify it to add a thumbnail on the right:

After the date `<span>`, add this at the end of the `justify-content: space-between` div:
```tsx
{afterPhotoUrl && (
  <img
    src={afterPhotoUrl}
    alt="After"
    style={{
      width: "48px", height: "48px", borderRadius: "8px",
      objectFit: "cover", border: "1px solid rgba(196,171,112,0.2)",
      flexShrink: 0,
    }}
  />
)}
```

Update the `FormulaCard` usages in the map to pass the prop:
```tsx
<FormulaCard
  key={entry.id}
  entry={entry}
  search={debouncedSearch}
  clientNames={clientNames}
  serviceTypeNames={serviceTypeNames}
  afterPhotoUrl={photoMap.get(entry.id)}
/>
```

Also wrap the card in a `Link` to make it clickable (navigate to detail):
```tsx
import Link from "next/link";
```

Wrap the entire `<Card>` in `FormulaCard` with:
```tsx
<Link href={`/app/formulas/${entry.id}`} style={{ textDecoration: "none", display: "block" }}>
  <Card style={{ cursor: "pointer" }}>
    ...
  </Card>
</Link>
```

(Link is already imported at the top of the file — check before adding again.)

### Part B: Formula detail page `/app/formulas/[id]`

**Step 3: Create the detail page**

```tsx
// src/app/app/formulas/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { FormulaEntry } from "@/lib/types";

type PhotoData = {
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  resultNotes: string | null;
  clientSatisfaction: number | null;
  completedAt: string;
} | null;

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<FormulaEntry | null>(null);
  const [photos, setPhotos] = useState<PhotoData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/formula-entries/${id}`).then((r) => r.json()),
      fetch(`/api/formula-entries/${id}/photos`).then((r) => r.json()),
    ])
      .then(([entryData, photoData]) => {
        setEntry(entryData?.id ? entryData : null);
        setPhotos(photoData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "rgba(241,239,224,0.4)" }}>
        Loading…
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "rgba(241,239,224,0.4)" }}>
        Formula not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/app/formulas"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-on-bark, #F5F0E8)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Formulas
        </Link>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)" }}>
          Formula
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
          {formatDate(entry.serviceDate)}
        </h2>
      </header>

      {/* Formula notes */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(196,171,112,0.7)" }}>
            Formula Notes
          </p>
          <pre style={{
            fontSize: "13px", color: "var(--text-on-stone-dim, #B8B3A8)",
            fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {entry.rawNotes}
          </pre>
          {entry.generalNotes && (
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.4)", fontStyle: "italic", borderTop: "1px solid rgba(196,171,112,0.1)", paddingTop: "8px" }}>
              {entry.generalNotes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Visual Result */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(196,171,112,0.7)" }}>
            Visual Result
          </p>
          {photos ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {(["before", "after"] as const).map((side) => {
                  const url = side === "before" ? photos.beforePhotoUrl : photos.afterPhotoUrl;
                  return (
                    <div key={side}>
                      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(196,171,112,0.6)", marginBottom: "6px" }}>
                        {side}
                      </p>
                      <div style={{ borderRadius: "10px", overflow: "hidden", aspectRatio: "3/4", background: "#1A1A14" }}>
                        {url ? (
                          <img src={url} alt={`${side} photo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(196,171,112,0.3)", fontSize: "12px" }}>
                            No {side} photo
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {photos.resultNotes && (
                <p style={{ fontSize: "13px", color: "rgba(241,239,224,0.6)", fontStyle: "italic" }}>
                  {photos.resultNotes}
                </p>
              )}
              {photos.clientSatisfaction && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "rgba(196,171,112,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Client Satisfaction</span>
                  <span style={{ fontSize: "14px" }}>
                    {"★".repeat(photos.clientSatisfaction)}{"☆".repeat(5 - photos.clientSatisfaction)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: "13px", color: "rgba(241,239,224,0.4)" }}>
              No photo on file for this formula.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 5: Commit**

```bash
git add src/app/app/formulas/page.tsx src/app/app/formulas/[id]/page.tsx
git commit -m "feat: formula list thumbnails + formula detail page with visual result"
```

---

## Task 9: Internal portfolio page /app/portfolio

**Files:**
- Create: `src/app/app/portfolio/page.tsx`

This page fetches the authenticated user's own portfolio. It shows the `BeforeAfterGallery` plus a settings card at the top with the portfolio_public toggle.

**Step 1: Create the page**

```tsx
// src/app/app/portfolio/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import { Card, CardContent } from "@/components/ui/card";
import type { PhotoPair } from "@/lib/types";

type PortfolioData = {
  pairs: PhotoPair[];
  stylistName: string;
  workspaceName: string;
  portfolioPublic: boolean;
} | null;

export default function PortfolioPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioData>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current user id
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch portfolio data once we have userId
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/portfolio/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.pairs) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleToggle() {
    if (!data || toggling) return;
    setToggling(true);
    const newValue = !data.portfolioPublic;
    try {
      const res = await fetch("/api/settings/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioPublic: newValue }),
      });
      if (res.ok) {
        setData((prev) => prev ? { ...prev, portfolioPublic: newValue } : prev);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    if (!userId) return;
    const url = `${window.location.origin}/stylist/${userId}/work`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const publicUrl = userId ? `${typeof window !== "undefined" ? window.location.origin : "https://opelle.app"}/stylist/${userId}/work` : "";

  return (
    <div className="space-y-6">
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
          Portfolio
        </h2>
        <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", marginTop: "4px" }}>
          {loading ? "Loading…" : `${data?.pairs.length ?? 0} photos`}
        </p>
      </header>

      {/* Settings card */}
      <Card>
        <CardContent className="p-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "14px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 500 }}>
                Make portfolio public
              </p>
              <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.4)", marginTop: "2px" }}>
                Anyone with the link can view your work
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling || !data}
              style={{
                width: "44px", height: "24px", borderRadius: "12px",
                border: "none", cursor: "pointer",
                background: data?.portfolioPublic ? "var(--brass, #C4AB70)" : "rgba(241,239,224,0.12)",
                transition: "background 0.2s",
                position: "relative", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: "2px",
                left: data?.portfolioPublic ? "22px" : "2px",
                width: "20px", height: "20px",
                borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
                display: "block",
              }} />
            </button>
          </div>

          {data?.portfolioPublic && userId && (
            <div style={{
              marginTop: "16px", padding: "10px 14px", borderRadius: "8px",
              background: "rgba(196,171,112,0.06)", border: "1px solid rgba(196,171,112,0.15)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
            }}>
              <span style={{ fontSize: "12px", color: "rgba(241,239,224,0.6)", wordBreak: "break-all" }}>
                {publicUrl}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  padding: "4px 12px", borderRadius: "6px",
                  background: copied ? "rgba(196,171,112,0.2)" : "rgba(196,171,112,0.1)",
                  border: "1px solid rgba(196,171,112,0.2)",
                  color: "var(--brass, #C4AB70)", fontSize: "11px", cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "14px" }}>
          Loading portfolio…
        </div>
      ) : (
        <BeforeAfterGallery
          pairs={data?.pairs ?? []}
          emptyMessage="No photos yet — complete color or chemical services with photos to build your portfolio."
        />
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add src/app/app/portfolio/page.tsx
git commit -m "feat: internal portfolio page /app/portfolio with public toggle"
```

---

## Task 10: Public portfolio page /stylist/[userId]/work

**Files:**
- Create: `src/app/stylist/[userId]/work/page.tsx`

This is a server component (no auth). It calls the portfolio API which returns 404 if `portfolio_public = false`.

**Step 1: Create the page**

```tsx
// src/app/stylist/[userId]/work/page.tsx
import { notFound } from "next/navigation";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import type { PhotoPair } from "@/lib/types";

interface Props {
  params: Promise<{ userId: string }>;
}

async function getPortfolioData(userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/portfolio/${userId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{
    pairs: PhotoPair[];
    stylistName: string;
    workspaceName: string;
    portfolioPublic: boolean;
  }>;
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { userId } = await params;
  const data = await getPortfolioData(userId);

  if (!data) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#1A1A14", color: "#F1EFE0" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(196,171,112,0.1)",
        padding: "24px",
        textAlign: "center",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,171,112,0.7)", marginBottom: "8px" }}>
          {data.workspaceName}
        </p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "32px", fontWeight: 300, color: "#FAF8F3" }}>
          {data.stylistName}
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(241,239,224,0.4)", marginTop: "8px" }}>
          {data.pairs.length} {data.pairs.length === 1 ? "service" : "services"}
        </p>
      </header>

      {/* Gallery */}
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <BeforeAfterGallery
          pairs={data.pairs}
          emptyMessage="No photos on file yet."
        />
      </main>
    </div>
  );
}
```

**Step 2: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add src/app/stylist/[userId]/work/page.tsx
git commit -m "feat: public portfolio page /stylist/[userId]/work"
```

---

## Task 11: Add Portfolio to AppNav

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`

**Step 1: Add the import for the Portfolio icon**

Find the lucide-react import block. Add `Images` to the import list:
```ts
import {
  // ... existing imports ...
  Images,
} from "lucide-react";
```

**Step 2: Add Portfolio to the Practice nav section**

Find the `NAV_SECTIONS` array. In the "Practice" section items array, add Portfolio after Formulas:

```ts
{ href: "/app/portfolio", label: "Portfolio", icon: Images },
```

So the Practice section items become:
```ts
items: [
  { href: "/app/formulas", label: "Formulas", icon: FlaskConical },
  { href: "/app/portfolio", label: "Portfolio", icon: Images },
  { href: "/app/products", label: "Products", icon: Package },
  // ... rest unchanged
],
```

**Step 3: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 4: Commit**

```bash
git add src/app/app/_components/AppNav.tsx
git commit -m "feat: add Portfolio link to AppNav"
```

---

## Task 12: Final verification + push to production

**Step 1: Full TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -80
```

Expected: zero errors (or only pre-existing unrelated errors — note any new ones and fix before proceeding).

**Step 2: Lint check**

```bash
npm run lint 2>&1 | head -60
```

Expected: no new errors.

**Step 3: Smoke test checklist**

1. Go to `/app/clients/[any-id]` → click "Photos" tab → verify gallery loads (or empty state)
2. Go to `/app/formulas` → verify cards with photo matches show a 48×48 thumbnail on the right
3. Click a formula card → verify it navigates to `/app/formulas/[id]` and shows Visual Result section
4. Go to `/app/portfolio` → verify gallery + toggle card renders
5. Toggle "Make portfolio public" on → verify URL appears + copy button works
6. Visit `/stylist/[your-userId]/work` → verify public page renders

**Step 4: Push to live**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && vercel deploy --prod --yes
```

---

## Reference

- Design doc: `docs/plans/2026-03-31-before-after-photo-visibility-design.md`
- `BeforeAfterCapture.tsx` — untouched
- `service_completions` table — data source for photos (columns: `before_photo_url`, `after_photo_url`)
- `formula_history` table — data source for formula outcome photos
- `workspaces.portfolio_public` — added in Task 1 migration
- No test framework — verification is tsc + lint + manual smoke
