# Opelle Refinements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix contrast/readability, restructure the Formulas tab into a searchable history browser, rename nav items + add a full audit History tab, and restore the cursor ring lag.

**Architecture:** Next.js 14 App Router with Supabase (postgres). All DB queries scoped by `workspace_id` via `getCurrentWorkspace()`. New pages follow the existing pattern in `src/app/app/`. New DB functions go in `src/lib/db/`. Activity logging is explicit (called in each API route handler), not middleware-based.

**Tech Stack:** Next.js 14, TypeScript, Supabase (postgres + JS SDK), Tailwind + CSS custom properties in globals.css, Lucide icons, DM Sans / Fraunces / Cormorant Garamond fonts.

---

## Task 1: CSS Contrast Fixes

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update background and text opacity values**

In `src/app/globals.css`, make these exact changes in the `:root` block:

```css
/* Change --bark-mid (the main app background) */
--bark-mid: #52504A;   /* was #474033 — lighter, cooler */

/* Raise faint text opacity for readability */
--text-on-bark-faint: rgba(237,232,222,0.65);  /* was 0.52 */
--text-on-bark-ghost: rgba(237,232,222,0.42);  /* was 0.30 */
```

Also update the body background to match:
```css
body {
  background: var(--bark-mid);   /* already uses the variable, no change needed */
}
```

**Step 2: Verify visually**

Run the dev server: `npm run dev` in `opelle-app-github/`
Open http://localhost:3000/app — the sidebar background should feel slightly lighter and cooler. Small labels like "PHONE", "ADDED" on client cards should be clearly readable.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: lighten background and raise faint text contrast"
```

---

## Task 2: Cursor Ring Lag

**Files:**
- Modify: `src/components/BrassCursor.tsx`

**Step 1: Understand the current code**

The current `BrassCursor.tsx` moves both dot and ring to `e.clientX/Y` immediately in the `mousemove` handler — no delay.

**Step 2: Replace with RAF lerp implementation**

Replace the entire file content with:

```tsx
"use client";

import { useEffect, useRef } from "react";

export function BrassCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let cursorX = -100, cursorY = -100;
    let ringX = -100, ringY = -100;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      dot.style.left = cursorX + "px";
      dot.style.top = cursorY + "px";
    };

    const animate = () => {
      ringX += (cursorX - ringX) * 0.12;
      ringY += (cursorY - ringY) * 0.12;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      rafId = requestAnimationFrame(animate);
    };

    const bindHover = () => {
      document
        .querySelectorAll("a,button,input,select,textarea,[role='button']")
        .forEach((el) => {
          el.addEventListener("mouseenter", () => {
            dot?.classList.add("hovering");
            ring?.classList.add("hovering");
          });
          el.addEventListener("mouseleave", () => {
            dot?.classList.remove("hovering");
            ring?.classList.remove("hovering");
          });
        });
    };

    document.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(animate);
    bindHover();

    const observer = new MutationObserver(bindHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
```

**Step 3: Verify**

Move your mouse quickly — the dot should snap to the cursor, while the outer ring floats behind with a slight lag. No stutter.

**Step 4: Commit**

```bash
git add src/components/BrassCursor.tsx
git commit -m "fix: add cursor ring lag using RAF lerp"
```

---

## Task 3: Move Log Formula Form to /app/formulas/log

The current `/app/formulas/page.tsx` is the input form. We need to move it to `/app/formulas/log/page.tsx` so that `/app/formulas` can become the history browser.

**Files:**
- Create: `src/app/app/formulas/log/page.tsx` (copy of current formulas/page.tsx)
- Create: `src/app/app/formulas/log/` directory

**Step 1: Create the directory and move the page**

```bash
mkdir -p src/app/app/formulas/log
cp src/app/app/formulas/page.tsx src/app/app/formulas/log/page.tsx
```

The file content is identical — no changes needed inside it. The form already works.

**Step 2: Update the nav CTA "Log Formula" button**

In `src/app/app/_components/AppNav.tsx`, find the "Log Formula" CTA button at the bottom (around line 159):

```tsx
<Link href="/app/formulas">
```

Change to:

```tsx
<Link href="/app/formulas/log">
```

**Step 3: Update redirect after save in the log form**

The form at `src/app/app/formulas/log/page.tsx` currently redirects to `/app/clients/${clientId}` after saving — that's correct, no change needed.

**Step 4: Update FormulaHistory "Log Formula" button**

In `src/app/app/clients/[id]/_components/FormulaHistory.tsx`, there are two links to `/app/formulas?clientId=...`. Update both:

```tsx
// Line 132 — header button
href={`/app/formulas/log?clientId=${clientId}`}

// Line 143 — empty state button
href={`/app/formulas/log?clientId=${clientId}`}
```

**Step 5: Verify**

- Click "Log Formula" in sidebar → should go to `/app/formulas/log` and show the form
- Submit a formula → should still redirect to the client profile
- "Log Formula" button on a client's formula history section → should go to `/app/formulas/log?clientId=...`

**Step 6: Commit**

```bash
git add src/app/app/formulas/log/page.tsx src/app/app/_components/AppNav.tsx src/app/app/clients/[id]/_components/FormulaHistory.tsx
git commit -m "feat: move log formula form to /app/formulas/log"
```

---

## Task 4: Formula History DB Function + API

**Files:**
- Modify: `src/lib/db/formula-entries.ts`
- Modify: `src/app/api/formula-entries/route.ts`

**Step 1: Add `listAllFormulaEntries` to the DB layer**

In `src/lib/db/formula-entries.ts`, add this new function after `getFormulaEntriesForClient`:

```ts
export async function listAllFormulaEntries(filters?: {
  clientId?: string;
  serviceTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<FormulaEntry[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("formula_entries")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("service_date", { ascending: false })
    .limit(300);

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters?.serviceTypeId) {
    query = query.eq("service_type_id", filters.serviceTypeId);
  }
  if (filters?.dateFrom) {
    query = query.gte("service_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("service_date", filters.dateTo);
  }
  if (filters?.search) {
    query = query.ilike("raw_notes", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as FormulaEntryRow[]).map(formulaEntryRowToModel);
}
```

**Step 2: Update the formula-entries GET API to support all filters**

Replace the GET handler in `src/app/api/formula-entries/route.ts`:

```ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const serviceTypeId = searchParams.get("serviceTypeId") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const search = searchParams.get("search") || undefined;

    const entries = await listAllFormulaEntries({ clientId, serviceTypeId, dateFrom, dateTo, search });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list formula entries:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}
```

Also update the import at the top to include the new function:
```ts
import { createFormulaEntry, listAllFormulaEntries } from "@/lib/db/formula-entries";
```
(Remove `getFormulaEntriesForClient` from this import — it's no longer used in the API route.)

**Step 3: Verify API**

With dev server running, open:
`http://localhost:3000/api/formula-entries` — should return all entries (empty array is fine).
`http://localhost:3000/api/formula-entries?search=bleach` — should filter.

**Step 4: Commit**

```bash
git add src/lib/db/formula-entries.ts src/app/api/formula-entries/route.ts
git commit -m "feat: add listAllFormulaEntries with search + filter support"
```

---

## Task 5: Formula History Browser Page

**Files:**
- Create: `src/app/app/formulas/page.tsx` (replaces current — current is now at `/log/page.tsx`)
- Create: `src/app/app/formulas/_components/FormulaSearchBar.tsx`

**Step 1: Create the search bar component**

Create `src/app/app/formulas/_components/FormulaSearchBar.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";
import type { ServiceType } from "@/lib/types";

interface FormulaSearchBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  serviceTypeId: string;
  onServiceTypeChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  serviceTypes: ServiceType[];
}

export function FormulaSearchBar({
  search, onSearchChange,
  serviceTypeId, onServiceTypeChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  serviceTypes,
}: FormulaSearchBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
      {/* Content search */}
      <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
        <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--text-on-stone-ghost)", pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Search formulas — bleach, level 6, RR..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            paddingLeft: "32px",
            paddingRight: "12px",
            paddingTop: "8px",
            paddingBottom: "8px",
            borderRadius: "8px",
            border: "1px solid var(--stone-mid)",
            background: "rgba(0,0,0,0.04)",
            fontSize: "13px",
            color: "var(--text-on-stone)",
            outline: "none",
          }}
        />
      </div>

      {/* Service type filter */}
      <select
        value={serviceTypeId}
        onChange={(e) => onServiceTypeChange(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
          flex: "0 0 auto",
        }}
      >
        <option value="">All service types</option>
        {serviceTypes.map((st) => (
          <option key={st.id} value={st.id}>{st.name}</option>
        ))}
      </select>

      {/* Date range */}
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
        }}
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
        }}
      />
    </div>
  );
}
```

**Step 2: Create the formula history browser page**

Create `src/app/app/formulas/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormulaSearchBar } from "./_components/FormulaSearchBar";
import type { FormulaEntry, ServiceType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function highlightMatch(text: string, search: string): string {
  if (!search.trim()) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "**$1**");
}

function FormulaCard({ entry, search, clientNames }: {
  entry: FormulaEntry;
  search: string;
  clientNames: Map<string, string>;
}) {
  const clientName = clientNames.get(entry.clientId) || "Unknown client";
  const preview = entry.rawNotes.slice(0, 200);
  const highlighted = highlightMatch(preview, search);
  // Bold matched segments by splitting on **...**
  const parts = highlighted.split(/\*\*(.*?)\*\*/g);

  return (
    <Card>
      <CardContent className="p-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <Link
              href={`/app/clients/${entry.clientId}`}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-on-stone)", textDecoration: "none" }}
            >
              {clientName}
            </Link>
            <span style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginLeft: "8px" }}>
              {formatDate(entry.serviceDate)}
            </span>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-dim)", fontFamily: "monospace", lineHeight: 1.5 }}>
          {parts.map((part, i) =>
            i % 2 === 1
              ? <mark key={i} style={{ background: "rgba(181,154,91,0.3)", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>{part}</mark>
              : <span key={i}>{part}</span>
          )}
          {entry.rawNotes.length > 200 && <span style={{ color: "var(--text-on-stone-ghost)" }}>…</span>}
        </p>
        {entry.generalNotes && (
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "6px", fontStyle: "italic" }}>
            {entry.generalNotes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FormulasPage() {
  const [entries, setEntries] = useState<FormulaEntry[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load service types and client names once
  useEffect(() => {
    Promise.all([
      fetch("/api/service-types").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([types, clients]) => {
      if (Array.isArray(types)) setServiceTypes(types);
      if (Array.isArray(clients)) {
        const map = new Map<string, string>();
        for (const c of clients) {
          map.set(c.id, [c.firstName, c.lastName].filter(Boolean).join(" "));
        }
        setClientNames(map);
      }
    }).catch(() => {});
  }, []);

  // Fetch entries whenever filters change
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (serviceTypeId) params.set("serviceTypeId", serviceTypeId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/formula-entries?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [serviceTypeId, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)", marginBottom: "4px" }}>
            Practice
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest)", fontWeight: 300 }}>
            Formulas
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-on-bark-faint)", marginTop: "4px" }}>
            {loading ? "Loading..." : `${entries.length} formula${entries.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/app/formulas/log">
          <button style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", borderRadius: "6px",
            background: "var(--garnet)", border: "1px solid var(--garnet-vivid)",
            color: "var(--stone-lightest)", fontSize: "12px", fontWeight: 500,
            letterSpacing: "0.05em",
          }}>
            <FlaskConical style={{ width: "13px", height: "13px" }} />
            Log Formula
          </button>
        </Link>
      </header>

      {/* Filter bar — on stone card */}
      <Card>
        <CardContent className="p-4">
          <FormulaSearchBar
            search={search} onSearchChange={setSearch}
            serviceTypeId={serviceTypeId} onServiceTypeChange={setServiceTypeId}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo} onDateToChange={setDateTo}
            serviceTypes={serviceTypes}
          />
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-on-bark-faint)", fontSize: "14px" }}>
          Loading formulas…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <FlaskConical style={{ width: "32px", height: "32px", margin: "0 auto 12px", color: "var(--text-on-bark-ghost)" }} />
          <p style={{ fontSize: "14px", color: "var(--text-on-bark-faint)" }}>
            {debouncedSearch || serviceTypeId || dateFrom || dateTo
              ? "No formulas match your filters"
              : "No formulas logged yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <FormulaCard key={entry.id} entry={entry} search={debouncedSearch} clientNames={clientNames} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify**

- `/app/formulas` → shows the history browser with filter bar
- Type "bleach" in search → results filter live
- Click on a client name in a result → navigates to that client's profile

**Step 4: Commit**

```bash
git add src/app/app/formulas/page.tsx src/app/app/formulas/_components/FormulaSearchBar.tsx
git commit -m "feat: formula history browser with content search and filters"
```

---

## Task 6: Nav Rename — Tasks + Add History

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`

**Step 1: Update NAV_SECTIONS**

In `src/app/app/_components/AppNav.tsx`, update the import block to add `History` icon (Lucide has `History`):

```ts
import {
  LayoutDashboard,
  Users,
  Calendar,
  FlaskConical,
  Package,
  CheckSquare,
  Settings,
  LogOut,
  Clock,
  History,
} from "lucide-react";
```

Then update the `NAV_SECTIONS` array — the "Practice" section:

```ts
{
  label: "Practice",
  items: [
    { href: "/app/formulas", label: "Formulas", icon: FlaskConical },
    { href: "/app/products", label: "Products", icon: Package },
    { href: "/app/tasks", label: "Tasks", icon: CheckSquare },      // was "History" with Clock
    { href: "/app/history", label: "History", icon: History },       // new
  ],
},
```

**Step 2: Verify**

Nav should show "Tasks" (with checkbox icon) and "History" (with history icon) in the Practice section.

**Step 3: Commit**

```bash
git add src/app/app/_components/AppNav.tsx
git commit -m "feat: rename nav Tasks item, add History nav item"
```

---

## Task 7: Activity Log — Database Migration

**Files:**
- Create: `migrations/2026-02-27-activity-log.sql`

**Step 1: Write the migration SQL**

Create `migrations/2026-02-27-activity-log.sql`:

```sql
-- Activity log for full audit trail
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_workspace_created
  ON public.activity_log(workspace_id, created_at DESC);

-- RLS: users can only see their own workspace's log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members see own log"
  ON public.activity_log FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "workspace members insert own log"
  ON public.activity_log FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  ));
```

**Step 2: Run the migration**

Using the Supabase dashboard: go to SQL Editor, paste and run the migration SQL.

OR if using the project's run-migration script:
```bash
node run-migration.js migrations/2026-02-27-activity-log.sql
```

**Step 3: Verify**

In Supabase dashboard → Table Editor → `activity_log` table should exist with the correct columns.

**Step 4: Commit**

```bash
git add migrations/2026-02-27-activity-log.sql
git commit -m "feat: add activity_log table migration"
```

---

## Task 8: Activity Log — DB Helper + API Routes

**Files:**
- Create: `src/lib/db/activity-log.ts`
- Modify: `src/app/api/formula-entries/route.ts`
- Modify: `src/app/api/clients/route.ts`
- Modify: `src/app/api/clients/[id]/route.ts`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/app/api/appointments/route.ts`
- Modify: `src/app/api/appointments/[id]/route.ts`
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`

**Step 1: Create the logging helper**

Create `src/lib/db/activity-log.ts`:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "./workspaces";

export type ActivityAction =
  | "formula.created"
  | "client.created" | "client.updated" | "client.deleted"
  | "product.created" | "product.updated" | "product.deleted"
  | "appointment.created" | "appointment.updated" | "appointment.deleted"
  | "task.created" | "task.updated" | "task.deleted";

export type EntityType = "formula" | "client" | "product" | "appointment" | "task";

export async function logActivity(
  action: ActivityAction,
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
): Promise<void> {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return;

    const supabase = await createSupabaseServerClient();
    await supabase.from("activity_log").insert({
      workspace_id: workspace.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      diff: diff || null,
    });
  } catch {
    // Never throw from logging — it's non-critical
  }
}

export type ActivityLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
};

export async function listActivityLog(entityType?: string): Promise<ActivityLogEntry[]> {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("activity_log")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityLabel: row.entity_label,
      diff: row.diff,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}
```

**Step 2: Add logging to formula-entries POST**

In `src/app/api/formula-entries/route.ts`, after the entry is created (after `if (!entry)` check), add:

```ts
import { logActivity } from "@/lib/db/activity-log";

// ... inside POST, after entry is created:
const clientRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/clients/${body.clientId}`);
// Simpler: just use the clientId as label for now, or pass name from body
await logActivity(
  "formula.created",
  "formula",
  entry.id,
  `Formula for client — ${entry.serviceDate}`
);
```

Actually, since we don't have the client name in scope in the API route without another DB call, use a simpler approach — log the entity_id and let the History page resolve names via the entry data:

```ts
await logActivity("formula.created", "formula", entry.id, entry.serviceDate);
```

**Step 3: Add logging to clients API routes**

In `src/app/api/clients/route.ts` POST handler, after client is created:
```ts
import { logActivity } from "@/lib/db/activity-log";
// After successful create:
await logActivity("client.created", "client", client.id, `${client.firstName} ${client.lastName || ""}`.trim());
```

In `src/app/api/clients/[id]/route.ts`:
- PATCH handler: `await logActivity("client.updated", "client", id, body.firstName || id, { after: body });`
- DELETE handler: `await logActivity("client.deleted", "client", id, id);`

**Step 4: Add logging to products API routes**

In `src/app/api/products/route.ts` POST:
```ts
await logActivity("product.created", "product", product.id, product.name);
```

In `src/app/api/products/[id]/route.ts`:
- PATCH: `await logActivity("product.updated", "product", id, body.name || id, { after: body });`
- DELETE: `await logActivity("product.deleted", "product", id, id);`

**Step 5: Add logging to appointments API routes**

In `src/app/api/appointments/route.ts` POST:
```ts
await logActivity("appointment.created", "appointment", appt.id, appt.serviceName || appt.startAt);
```

In `src/app/api/appointments/[id]/route.ts`:
- PATCH: `await logActivity("appointment.updated", "appointment", id, body.serviceName || id, { after: body });`
- DELETE: `await logActivity("appointment.deleted", "appointment", id, id);`

**Step 6: Add logging to tasks API routes**

In `src/app/api/tasks/route.ts` POST:
```ts
await logActivity("task.created", "task", task.id, task.title);
```

In `src/app/api/tasks/[id]/route.ts`:
- PATCH: `await logActivity("task.updated", "task", id, body.title || id, { after: body });`
- DELETE: `await logActivity("task.deleted", "task", id, id);`

**Step 7: Create the activity log API route**

Create `src/app/api/activity-log/route.ts`:

```ts
import { NextResponse } from "next/server";
import { listActivityLog } from "@/lib/db/activity-log";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entries = await listActivityLog(entityType);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list activity log:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}
```

**Step 8: Verify**

- Log a new formula → check `activity_log` in Supabase dashboard — a row should appear
- Create a new client → another row

**Step 9: Commit**

```bash
git add src/lib/db/activity-log.ts src/app/api/activity-log/route.ts \
  src/app/api/formula-entries/route.ts \
  src/app/api/clients/route.ts src/app/api/clients/[id]/route.ts \
  src/app/api/products/route.ts src/app/api/products/[id]/route.ts \
  src/app/api/appointments/route.ts src/app/api/appointments/[id]/route.ts \
  src/app/api/tasks/route.ts src/app/api/tasks/[id]/route.ts
git commit -m "feat: activity log helper + logging in all API routes"
```

---

## Task 9: History Page

**Files:**
- Create: `src/app/app/history/page.tsx`

**Step 1: Create the History page**

Create `src/app/app/history/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FlaskConical, Users, Package, Calendar, CheckSquare, History, Loader2
} from "lucide-react";
import type { ActivityLogEntry } from "@/lib/db/activity-log";

const ENTITY_FILTERS = [
  { label: "All", value: "" },
  { label: "Formulas", value: "formula" },
  { label: "Clients", value: "client" },
  { label: "Products", value: "product" },
  { label: "Appointments", value: "appointment" },
  { label: "Tasks", value: "task" },
];

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  formula: <FlaskConical style={{ width: "14px", height: "14px" }} />,
  client: <Users style={{ width: "14px", height: "14px" }} />,
  product: <Package style={{ width: "14px", height: "14px" }} />,
  appointment: <Calendar style={{ width: "14px", height: "14px" }} />,
  task: <CheckSquare style={{ width: "14px", height: "14px" }} />,
};

const ACTION_LABELS: Record<string, string> = {
  "formula.created": "Formula logged",
  "client.created": "Client added",
  "client.updated": "Client updated",
  "client.deleted": "Client deleted",
  "product.created": "Product added",
  "product.updated": "Product updated",
  "product.deleted": "Product deleted",
  "appointment.created": "Appointment created",
  "appointment.updated": "Appointment updated",
  "appointment.deleted": "Appointment deleted",
  "task.created": "Task created",
  "task.updated": "Task updated",
  "task.deleted": "Task deleted",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?entityType=${filter}` : "";
    fetch(`/api/activity-log${params}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest)", fontWeight: 300 }}>
          History
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-on-bark-faint)", marginTop: "4px" }}>
          Every action taken in your workspace.
        </p>
      </header>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: "5px 12px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 500,
              border: "1px solid",
              borderColor: filter === f.value ? "var(--brass-warm)" : "var(--brass-line)",
              background: filter === f.value ? "rgba(181,154,91,0.12)" : "transparent",
              color: filter === f.value ? "var(--brass-warm)" : "var(--text-on-bark-faint)",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <Loader2 style={{ width: "24px", height: "24px", margin: "0 auto", color: "var(--text-on-bark-ghost)" }} className="animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "48px", textAlign: "center" }}>
            <History style={{ width: "32px", height: "32px", margin: "0 auto 12px", color: "var(--text-on-bark-ghost)" }} />
            <p style={{ fontSize: "14px", color: "var(--text-on-bark-faint)" }}>
              No activity yet — actions will appear here as you use the app.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                  background: "rgba(181,154,91,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--brass-warm)",
                }}>
                  {ENTITY_ICONS[entry.entityType] || <History style={{ width: "14px", height: "14px" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </p>
                  {entry.entityLabel && (
                    <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
                      {entry.entityLabel}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", flexShrink: 0 }}>
                  {relativeTime(entry.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify**

- `/app/history` → shows the activity feed
- Filter chips filter by entity type
- Relative timestamps display correctly
- Empty state shows when no actions logged yet

**Step 3: Commit**

```bash
git add src/app/app/history/page.tsx
git commit -m "feat: history page with full audit activity feed"
```

---

## Summary — Execution Order

| Task | What | Time est. |
|------|------|-----------|
| 1 | CSS contrast (globals.css) | 5 min |
| 2 | Cursor ring lag (BrassCursor.tsx) | 5 min |
| 3 | Move log formula to /formulas/log | 10 min |
| 4 | Formula history DB + API | 15 min |
| 5 | Formula history browser page | 20 min |
| 6 | Nav rename + add History item | 5 min |
| 7 | Activity log SQL migration | 10 min |
| 8 | Activity log helper + API route logging | 25 min |
| 9 | History page UI | 15 min |
