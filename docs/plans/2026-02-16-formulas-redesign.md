# Formulas Redesign — Smart Notepad Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the structured formula builder with a freeform notepad where stylists jot notes naturally, Claude AI parses them into structured bowls, and formula history lives on client profiles grouped by service type.

**Architecture:** New `formula_entries` and `service_types` DB tables. Freeform textarea input on `/app/formulas` page. AI parsing via Anthropic SDK server-side route. Client profile page gets accordion-based formula history. Old formula detail/edit pages deleted.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, Anthropic Claude API (`@anthropic-ai/sdk`), TypeScript, Tailwind CSS, Lucide icons

---

### Task 1: Database Migration — Create `service_types` and `formula_entries` tables

**Files:**
- Create: `migrations/2026-02-16-formula-entries.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================================
-- Formulas Redesign: service_types + formula_entries
-- ============================================================================

-- Service types: editable list per workspace
CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Formula entries: freeform notepad entries
CREATE TABLE public.formula_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
  raw_notes TEXT NOT NULL,
  parsed_formula JSONB,
  general_notes TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_select" ON public.service_types
  FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_insert" ON public.service_types
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_update" ON public.service_types
  FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_delete" ON public.service_types
  FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workspace_owner_select" ON public.formula_entries
  FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_insert" ON public.formula_entries
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_update" ON public.formula_entries
  FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_delete" ON public.formula_entries
  FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX idx_service_types_workspace ON public.service_types(workspace_id);
CREATE INDEX idx_formula_entries_workspace ON public.formula_entries(workspace_id);
CREATE INDEX idx_formula_entries_client ON public.formula_entries(client_id);
CREATE INDEX idx_formula_entries_service_type ON public.formula_entries(service_type_id);
CREATE INDEX idx_formula_entries_client_date ON public.formula_entries(client_id, service_date DESC);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.formula_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Step 2: Run migration in Supabase SQL editor**

Run: Copy the SQL above into the Supabase SQL editor and execute it.
Expected: Tables created successfully, no errors.

**Step 3: Commit**

```bash
git add migrations/2026-02-16-formula-entries.sql
git commit -m "feat: add service_types and formula_entries tables for formulas redesign"
```

---

### Task 2: Install Anthropic SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @anthropic-ai/sdk`
Expected: Package added to dependencies in package.json

**Step 2: Verify .env has ANTHROPIC_API_KEY**

Check that `.env.local` has:
```
ANTHROPIC_API_KEY=sk-ant-...
```

If not, add the placeholder. The actual key must be provided by the user.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @anthropic-ai/sdk for formula parsing"
```

---

### Task 3: TypeScript Types — FormulaEntry, ServiceType, ParsedFormula

**Files:**
- Modify: `src/lib/types.ts:91-117` (replace old Formula types) and add new row types + converters

**Step 1: Add new types after the Product types block (after line 89)**

Replace lines 91-117 (the old `FormulaServiceType`, `FormulaStep`, `Formula` types) with:

```typescript
// Service Type (workspace-editable list)
export type ServiceType = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

// Parsed formula structures
export type ParsedProduct = {
  name: string;
  amount?: string;
  brand?: string;
};

export type ParsedDeveloper = {
  volume: string;
  amount?: string;
};

export type ParsedBowl = {
  label: string;
  products: ParsedProduct[];
  developer?: ParsedDeveloper;
  processingTime?: string;
  applicationNotes?: string;
};

export type ParsedFormula = {
  bowls: ParsedBowl[];
};

// Formula Entry (new notepad-based formula)
export type FormulaEntry = {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceTypeId: string;
  rawNotes: string;
  parsedFormula: ParsedFormula | null;
  generalNotes?: string;
  serviceDate: string;
  createdAt: string;
  updatedAt: string;
};
```

Keep the old `FormulaServiceType`, `FormulaStep`, and `Formula` types but mark them as deprecated with a comment `// @deprecated — old formula system, kept for migration compatibility` above each.

**Step 2: Add new Row types**

In the database row types section (around line 295-308 where `FormulaRow` is), add these AFTER `FormulaRow`:

```typescript
export type ServiceTypeRow = {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type FormulaEntryRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  service_type_id: string;
  raw_notes: string;
  parsed_formula: ParsedFormula | null;
  general_notes: string | null;
  service_date: string;
  created_at: string;
  updated_at: string;
};
```

**Step 3: Add converter functions**

In the conversion helpers section (after the existing `formulaRowToModel` function around line 419), add:

```typescript
export function serviceTypeRowToModel(row: ServiceTypeRow): ServiceType {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function formulaEntryRowToModel(row: FormulaEntryRow): FormulaEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    serviceTypeId: row.service_type_id,
    rawNotes: row.raw_notes,
    parsedFormula: row.parsed_formula,
    generalNotes: row.general_notes ?? undefined,
    serviceDate: row.service_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors (old files referencing old Formula types may error — that's expected and will be fixed in later tasks)

**Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add FormulaEntry, ServiceType, ParsedFormula types"
```

---

### Task 4: Database Functions — service-types.ts

**Files:**
- Create: `src/lib/db/service-types.ts`

**Step 1: Create the service types DB module**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceType, ServiceTypeRow } from "@/lib/types";
import { serviceTypeRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function listServiceTypes(): Promise<ServiceType[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_types")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as ServiceTypeRow[]).map(serviceTypeRowToModel);
}

export async function getServiceType(id: string): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_types")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function createServiceType(input: {
  name: string;
  sortOrder?: number;
}): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();

  // If no sort_order provided, put it at the end
  let sortOrder = input.sortOrder ?? 0;
  if (input.sortOrder === undefined) {
    const { data: maxRow } = await supabase
      .from("service_types")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    sortOrder = (maxRow?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("service_types")
    .insert({
      workspace_id: workspace.id,
      name: input.name,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function updateServiceType(
  id: string,
  input: { name?: string; sortOrder?: number }
): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("service_types")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function deleteServiceType(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("service_types")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

export async function seedDefaultServiceTypes(): Promise<void> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return;

  const supabase = await createSupabaseServerClient();

  // Check if workspace already has service types
  const { data: existing } = await supabase
    .from("service_types")
    .select("id")
    .eq("workspace_id", workspace.id)
    .limit(1);

  if (existing && existing.length > 0) return;

  const defaults = [
    "Base Color",
    "All Over Color",
    "Gloss",
    "Partial Highlight",
    "Full Highlight",
    "Partial Balayage",
    "Full Balayage",
    "Mini Highlight",
  ];

  await supabase.from("service_types").insert(
    defaults.map((name, index) => ({
      workspace_id: workspace.id,
      name,
      sort_order: index,
    }))
  );
}
```

**Step 2: Commit**

```bash
git add src/lib/db/service-types.ts
git commit -m "feat: add service-types DB functions with seed defaults"
```

---

### Task 5: Database Functions — formula-entries.ts

**Files:**
- Create: `src/lib/db/formula-entries.ts`

**Step 1: Create the formula entries DB module**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormulaEntry, FormulaEntryRow, ParsedFormula } from "@/lib/types";
import { formulaEntryRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function getFormulaEntriesForClient(
  clientId: string
): Promise<FormulaEntry[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("client_id", clientId)
    .order("service_date", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaEntryRow[]).map(formulaEntryRowToModel);
}

export async function getFormulaEntry(id: string): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function createFormulaEntry(input: {
  clientId: string;
  serviceTypeId: string;
  rawNotes: string;
  generalNotes?: string;
  serviceDate?: string;
}): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .insert({
      workspace_id: workspace.id,
      client_id: input.clientId,
      service_type_id: input.serviceTypeId,
      raw_notes: input.rawNotes,
      general_notes: input.generalNotes || null,
      service_date: input.serviceDate || new Date().toISOString().split("T")[0],
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function updateFormulaEntry(
  id: string,
  input: {
    rawNotes?: string;
    parsedFormula?: ParsedFormula | null;
    generalNotes?: string;
    serviceTypeId?: string;
    serviceDate?: string;
  }
): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const updateData: Record<string, unknown> = {};
  if (input.rawNotes !== undefined) updateData.raw_notes = input.rawNotes;
  if (input.parsedFormula !== undefined) updateData.parsed_formula = input.parsedFormula;
  if (input.generalNotes !== undefined) updateData.general_notes = input.generalNotes || null;
  if (input.serviceTypeId !== undefined) updateData.service_type_id = input.serviceTypeId;
  if (input.serviceDate !== undefined) updateData.service_date = input.serviceDate;

  const { data, error } = await supabase
    .from("formula_entries")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function deleteFormulaEntry(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("formula_entries")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}
```

**Step 2: Commit**

```bash
git add src/lib/db/formula-entries.ts
git commit -m "feat: add formula-entries DB functions"
```

---

### Task 6: API Routes — Service Types CRUD

**Files:**
- Create: `src/app/api/service-types/route.ts`
- Create: `src/app/api/service-types/[id]/route.ts`
- Create: `src/app/api/service-types/seed/route.ts`

**Step 1: Create the list + create route**

`src/app/api/service-types/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { listServiceTypes, createServiceType } from "@/lib/db/service-types";

export async function GET() {
  try {
    const types = await listServiceTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Failed to list service types:", error);
    return NextResponse.json({ error: "Failed to list service types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const serviceType = await createServiceType({
      name: body.name.trim(),
      sortOrder: body.sortOrder,
    });

    if (!serviceType) {
      return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
    }

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("Failed to create service type:", error);
    return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
  }
}
```

**Step 2: Create the detail route**

`src/app/api/service-types/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { updateServiceType, deleteServiceType } from "@/lib/db/service-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const serviceType = await updateServiceType(id, {
      name: body.name,
      sortOrder: body.sortOrder,
    });

    if (!serviceType) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("Failed to update service type:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteServiceType(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service type:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
```

**Step 3: Create the seed route**

`src/app/api/service-types/seed/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { seedDefaultServiceTypes, listServiceTypes } from "@/lib/db/service-types";

export async function POST() {
  try {
    await seedDefaultServiceTypes();
    const types = await listServiceTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Failed to seed service types:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/service-types/
git commit -m "feat: add service-types API routes (CRUD + seed)"
```

---

### Task 7: API Routes — Formula Entries CRUD

**Files:**
- Create: `src/app/api/formula-entries/route.ts`
- Create: `src/app/api/formula-entries/[id]/route.ts`

**Step 1: Create the list + create route**

`src/app/api/formula-entries/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createFormulaEntry, getFormulaEntriesForClient } from "@/lib/db/formula-entries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const entries = await getFormulaEntriesForClient(clientId);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list formula entries:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.serviceTypeId || !body.rawNotes?.trim()) {
      return NextResponse.json(
        { error: "clientId, serviceTypeId, and rawNotes are required" },
        { status: 400 }
      );
    }

    const entry = await createFormulaEntry({
      clientId: body.clientId,
      serviceTypeId: body.serviceTypeId,
      rawNotes: body.rawNotes.trim(),
      generalNotes: body.generalNotes?.trim() || undefined,
      serviceDate: body.serviceDate || undefined,
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to create formula entry:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
```

**Step 2: Create the detail route**

`src/app/api/formula-entries/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getFormulaEntry, updateFormulaEntry, deleteFormulaEntry } from "@/lib/db/formula-entries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entry = await getFormulaEntry(id);

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to get formula entry:", error);
    return NextResponse.json({ error: "Failed to get" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const entry = await updateFormulaEntry(id, {
      rawNotes: body.rawNotes,
      parsedFormula: body.parsedFormula,
      generalNotes: body.generalNotes,
      serviceTypeId: body.serviceTypeId,
      serviceDate: body.serviceDate,
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to update formula entry:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteFormulaEntry(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete formula entry:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/formula-entries/
git commit -m "feat: add formula-entries API routes (CRUD)"
```

---

### Task 8: AI Parsing API Route

**Files:**
- Create: `src/app/api/formulas/parse/route.ts`

**Step 1: Create the AI parsing endpoint**

```typescript
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a hair color formula parser for professional stylists. Your job is to take freeform notes about hair color formulations and parse them into structured JSON.

Given raw notes like "2 oz of 8.6n and 2 of 7.6n with 4 oz of 10 vol" or "bowl 1: shades eq 8n 1oz + 9gi 1oz with processing solution. 35 min. Bowl 2: redken flash lift + 30vol 1:2", extract and organize into bowls.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "bowls": [
    {
      "label": "Bowl 1",
      "products": [
        { "name": "8.6N", "amount": "2 oz", "brand": "" }
      ],
      "developer": { "volume": "10vol", "amount": "4 oz" },
      "processingTime": "35 min",
      "applicationNotes": ""
    }
  ]
}

Rules:
- Each distinct mix/bowl should be a separate bowl entry
- If no separate bowls mentioned, group everything into "Bowl 1"
- Normalize shade names to uppercase (e.g., "8.6n" -> "8.6N")
- Normalize developer volumes (e.g., "10 vol" -> "10vol", "twenty volume" -> "20vol")
- If a brand is mentioned (Redken, Wella, Schwarzkopf, etc.), include it
- If processing time is mentioned, include it
- Omit fields that are empty — don't include empty strings, use null or omit
- applicationNotes is for placement/technique info (e.g., "roots to midshaft", "foils on crown")
- If notes are unclear, do your best to parse what's there
- ONLY return JSON, no other text`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.rawNotes?.trim()) {
      return NextResponse.json({ error: "rawNotes is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: body.rawNotes.trim(),
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    const parsed = JSON.parse(textBlock.text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to parse formula:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse formula" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/formulas/parse/route.ts
git commit -m "feat: add AI formula parsing endpoint using Anthropic Claude"
```

---

### Task 9: Update Sidebar Navigation

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx:24`

**Step 1: Change the Formulas nav label**

Change line 24 from:
```typescript
  { href: "/app/formulas", label: "Formulas", icon: FlaskConical },
```
to:
```typescript
  { href: "/app/formulas", label: "Log Formula", icon: FlaskConical },
```

**Step 2: Commit**

```bash
git add src/app/app/_components/AppNav.tsx
git commit -m "feat: rename sidebar Formulas link to Log Formula"
```

---

### Task 10: Rewrite `/app/formulas/page.tsx` — Log Formula Notepad

This is the main page. It's a client-side form with: client picker, service type dropdown, date picker, formula notes textarea, general notes textarea, and save button. After saving, it triggers AI parsing in the background.

**Files:**
- Rewrite: `src/app/app/formulas/page.tsx` (complete replacement)
- Create: `src/app/app/formulas/_components/ClientPicker.tsx`

**Step 1: Create the ClientPicker component**

`src/app/app/formulas/_components/ClientPicker.tsx`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import type { Client } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";

interface ClientPickerProps {
  value: string;
  onChange: (clientId: string) => void;
}

export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        if (value) {
          const found = data.find((c: Client) => c.id === value);
          if (found) setSelectedClient(found);
        }
      })
      .catch(() => {});
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = clients.filter((c) => {
    const name = getClientDisplayName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSelect = (client: Client) => {
    setSelectedClient(client);
    onChange(client.id);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedClient(null);
    onChange("");
    setSearch("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      {selectedClient ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-medium text-black">
            {selectedClient.firstName[0]}
            {selectedClient.lastName?.[0] || ""}
          </div>
          <span className="flex-1 font-medium">
            {getClientDisplayName(selectedClient)}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a client..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
      )}

      {isOpen && !selectedClient && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-xl max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No clients found
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-medium text-black shrink-0">
                  {client.firstName[0]}
                  {client.lastName?.[0] || ""}
                </div>
                <span className="text-sm font-medium">
                  {getClientDisplayName(client)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Rewrite the formulas page as the Log Formula notepad**

Completely replace `src/app/app/formulas/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FlaskConical, Check, Loader2 } from "lucide-react";
import { ClientPicker } from "./_components/ClientPicker";
import type { ServiceType } from "@/lib/types";

export default function LogFormulaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") || "";

  const [clientId, setClientId] = useState(preselectedClientId);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rawNotes, setRawNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load service types (seed if empty)
  useEffect(() => {
    async function loadServiceTypes() {
      let res = await fetch("/api/service-types");
      let types = await res.json();

      if (Array.isArray(types) && types.length === 0) {
        // Seed defaults
        res = await fetch("/api/service-types/seed", { method: "POST" });
        types = await res.json();
      }

      if (Array.isArray(types)) {
        setServiceTypes(types);
      }
    }
    loadServiceTypes().catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!clientId || !serviceTypeId || !rawNotes.trim()) {
      setError("Please fill in client, service type, and formula notes.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Save the formula entry
      const res = await fetch("/api/formula-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceTypeId,
          rawNotes: rawNotes.trim(),
          generalNotes: generalNotes.trim() || undefined,
          serviceDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save formula");
      }

      const entry = await res.json();
      setSaved(true);

      // 2. Trigger AI parsing in background
      setParsing(true);
      try {
        const parseRes = await fetch("/api/formulas/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawNotes: rawNotes.trim() }),
        });

        if (parseRes.ok) {
          const parsed = await parseRes.json();
          // Update the entry with parsed formula
          await fetch(`/api/formula-entries/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parsedFormula: parsed }),
          });
        }
      } catch {
        // AI parsing failed — that's OK, raw notes are saved
        console.error("AI parsing failed, raw notes saved");
      } finally {
        setParsing(false);
      }

      // 3. Redirect to client profile after short delay
      setTimeout(() => {
        router.push(`/app/clients/${clientId}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Notepad
        </p>
        <h2 className="text-3xl font-semibold">Log Formula</h2>
        <p className="text-muted-foreground">
          Jot down what you mixed — AI will format it for you.
        </p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Formula saved!
              {parsing && (
                <span className="flex items-center gap-1 ml-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI formatting...
                </span>
              )}
            </div>
          )}

          {/* Client Picker */}
          <div>
            <Label className="mb-2 block">Client *</Label>
            <ClientPicker value={clientId} onChange={setClientId} />
          </div>

          {/* Service Type + Date */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="serviceType" className="mb-2 block">Service Type *</Label>
              <select
                id="serviceType"
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select service type</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="serviceDate" className="mb-2 block">Date</Label>
              <Input
                id="serviceDate"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
          </div>

          {/* Formula Notes */}
          <div>
            <Label htmlFor="rawNotes" className="mb-2 block">
              Formula Notes *
            </Label>
            <Textarea
              id="rawNotes"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="e.g., Bowl 1: 2 oz of 8.6N and 2 of 7.6N with 4 oz of 10 vol. 35 min at roots to midshaft.&#10;&#10;Bowl 2: Redken Flash Lift + 30vol 1:2 in foils on crown..."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Write naturally — AI will parse your bowls, products, amounts, and timing.
            </p>
          </div>

          {/* General Notes */}
          <div>
            <Label htmlFor="generalNotes" className="mb-2 block">
              General Notes
            </Label>
            <Textarea
              id="generalNotes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Client preferences, plans for next visit, observations..."
              rows={3}
            />
          </div>

          {/* Save */}
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Save Formula
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/app/formulas/page.tsx src/app/app/formulas/_components/ClientPicker.tsx
git commit -m "feat: rewrite formulas page as Log Formula notepad with AI parsing"
```

---

### Task 11: Delete Old Formula Pages

**Files:**
- Delete: `src/app/app/formulas/new/page.tsx`
- Delete: `src/app/app/formulas/[id]/page.tsx`
- Delete: `src/app/app/formulas/[id]/edit/page.tsx`
- Delete: `src/app/app/formulas/[id]/_components/FormulaActions.tsx`

**Step 1: Remove old formula pages**

```bash
rm src/app/app/formulas/new/page.tsx
rm src/app/app/formulas/\[id\]/page.tsx
rm src/app/app/formulas/\[id\]/edit/page.tsx
rm src/app/app/formulas/\[id\]/_components/FormulaActions.tsx
```

Then clean up empty directories:
```bash
rmdir src/app/app/formulas/\[id\]/_components
rmdir src/app/app/formulas/\[id\]/edit
rmdir src/app/app/formulas/\[id\]
rmdir src/app/app/formulas/new
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old formula detail, edit, and new pages"
```

---

### Task 12: Redesign Client Profile — Formula History with Accordion

**Files:**
- Modify: `src/app/app/clients/[id]/page.tsx:1-227` (replace formulas section)
- Create: `src/app/app/clients/[id]/_components/FormulaHistory.tsx`

**Step 1: Create the FormulaHistory client component**

`src/app/app/clients/[id]/_components/FormulaHistory.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus, Eye, EyeOff } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { FormulaEntry, ServiceType, ParsedBowl } from "@/lib/types";

interface FormulaHistoryProps {
  clientId: string;
  entries: FormulaEntry[];
  serviceTypes: ServiceType[];
}

function BowlCard({ bowl }: { bowl: ParsedBowl }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
      <p className="text-sm font-medium text-emerald-400">{bowl.label}</p>
      <div className="space-y-1">
        {bowl.products.map((p, i) => (
          <p key={i} className="text-sm">
            {p.amount && <span className="text-muted-foreground">{p.amount} </span>}
            <span className="font-medium">{p.name}</span>
            {p.brand && <span className="text-muted-foreground"> ({p.brand})</span>}
          </p>
        ))}
      </div>
      {bowl.developer && (
        <p className="text-sm text-muted-foreground">
          Developer: {bowl.developer.volume}
          {bowl.developer.amount && ` — ${bowl.developer.amount}`}
        </p>
      )}
      {bowl.processingTime && (
        <p className="text-sm text-muted-foreground">
          Processing: {bowl.processingTime}
        </p>
      )}
      {bowl.applicationNotes && (
        <p className="text-sm italic text-muted-foreground">
          {bowl.applicationNotes}
        </p>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: FormulaEntry }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {formatDate(entry.serviceDate)}
        </span>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRaw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showRaw ? "Hide raw" : "Raw notes"}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-sm whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3 text-muted-foreground">
          {entry.rawNotes}
        </pre>
      ) : entry.parsedFormula?.bowls ? (
        <div className="space-y-3">
          {entry.parsedFormula.bowls.map((bowl, i) => (
            <BowlCard key={i} bowl={bowl} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p className="mb-1">AI formatting pending...</p>
          <pre className="whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3">
            {entry.rawNotes}
          </pre>
        </div>
      )}

      {entry.generalNotes && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm">{entry.generalNotes}</p>
        </div>
      )}
    </div>
  );
}

export function FormulaHistory({ clientId, entries, serviceTypes }: FormulaHistoryProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Group entries by service type
  const grouped = new Map<string, FormulaEntry[]>();
  for (const entry of entries) {
    const existing = grouped.get(entry.serviceTypeId) || [];
    existing.push(entry);
    grouped.set(entry.serviceTypeId, existing);
  }

  const serviceTypeMap = new Map(serviceTypes.map((st) => [st.id, st]));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sort service types by their sort_order, only include ones that have entries
  const sortedTypes = serviceTypes
    .filter((st) => grouped.has(st.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Formula History</h3>
          <p className="text-sm text-muted-foreground">{entries.length} entries</p>
        </div>
        <Link href={`/app/formulas?clientId=${clientId}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Log Formula
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No formulas logged yet</p>
          <Link href={`/app/formulas?clientId=${clientId}`}>
            <Button size="sm" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Log First Formula
            </Button>
          </Link>
        </div>
      ) : (
        sortedTypes.map((st) => {
          const sectionEntries = grouped.get(st.id) || [];
          const isOpen = openSections.has(st.id);

          return (
            <div key={st.id} className="rounded-xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(st.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{st.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {sectionEntries.length} {sectionEntries.length === 1 ? "entry" : "entries"}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-3">
                  {sectionEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
```

**Step 2: Update the client detail page to use FormulaHistory**

Modify `src/app/app/clients/[id]/page.tsx`:

1. Replace the import of `getFormulasForClient` with the new imports:
   - Change line 8 from: `import { getFormulasForClient } from "@/lib/db/formulas";`
   - To: `import { getFormulaEntriesForClient } from "@/lib/db/formula-entries";`
   - Add: `import { listServiceTypes } from "@/lib/db/service-types";`
   - Add: `import { FormulaHistory } from "./_components/FormulaHistory";`

2. Update the data fetching (line 19-23):
   - Change from:
     ```typescript
     const [client, appointments, formulas] = await Promise.all([
       getClient(id),
       getAppointmentsForClient(id),
       getFormulasForClient(id),
     ]);
     ```
   - To:
     ```typescript
     const [client, appointments, formulaEntries, serviceTypes] = await Promise.all([
       getClient(id),
       getAppointmentsForClient(id),
       getFormulaEntriesForClient(id),
       listServiceTypes(),
     ]);
     ```

3. Replace the entire Formulas Card section (lines 178-224) with:
   ```tsx
   {/* Formula History */}
   <Card>
     <CardContent className="p-6">
       <FormulaHistory
         clientId={client.id}
         entries={formulaEntries}
         serviceTypes={serviceTypes}
       />
     </CardContent>
   </Card>
   ```

4. Remove unused imports: `FlaskConical` and `Plus` if no longer used elsewhere in this file (check — `Plus` is used by the appointments section, `FlaskConical` was used by old formulas section). Remove `FlaskConical` from the lucide import on line 11.

**Step 3: Commit**

```bash
git add src/app/app/clients/\[id\]/page.tsx src/app/app/clients/\[id\]/_components/FormulaHistory.tsx
git commit -m "feat: redesign client profile formula section with accordion history"
```

---

### Task 13: Service Types Management in Settings

**Files:**
- Create: `src/app/app/settings/_components/ServiceTypesManager.tsx`
- Modify: `src/app/app/settings/page.tsx` (add Service Types card)

**Step 1: Create ServiceTypesManager component**

`src/app/app/settings/_components/ServiceTypesManager.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ServiceType } from "@/lib/types";

export function ServiceTypesManager() {
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/service-types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTypes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/service-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.ok) {
      const created = await res.json();
      setTypes((prev) => [...prev, created]);
      setNewName("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service type? Existing formulas using it will be affected.")) return;

    const res = await fetch(`/api/service-types/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleRename = async (id: string, name: string) => {
    await fetch(`/api/service-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-3">
      {types.map((st) => (
        <div
          key={st.id}
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <input
            type="text"
            defaultValue={st.name}
            onBlur={(e) => {
              if (e.target.value !== st.name) {
                handleRename(st.id, e.target.value);
              }
            }}
            className="flex-1 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1"
          />
          <button
            type="button"
            onClick={() => handleDelete(st.id)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New service type..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Add Service Types card to settings page**

In `src/app/app/settings/page.tsx`:

1. Add import at top:
   ```typescript
   import { ServiceTypesManager } from "./_components/ServiceTypesManager";
   ```

2. Add a new Card block AFTER the Workspace card (after line 64, before the Data Export card):
   ```tsx
   {/* Service Types */}
   <Card>
     <CardHeader>
       <CardTitle>Service Types</CardTitle>
       <CardDescription>Manage the service types available when logging formulas</CardDescription>
     </CardHeader>
     <CardContent>
       <ServiceTypesManager />
     </CardContent>
   </Card>
   ```

**Step 3: Commit**

```bash
git add src/app/app/settings/_components/ServiceTypesManager.tsx src/app/app/settings/page.tsx
git commit -m "feat: add service types management to settings page"
```

---

### Task 14: Update Old Formula API Routes

**Files:**
- Modify: `src/app/api/formulas/route.ts` (keep GET for backward compat, update POST)

**Step 1: Simplify the old formulas route**

The old `src/app/api/formulas/route.ts` can be simplified. We still keep the GET for any backward references but the POST is no longer used by the new notepad. The old `/api/formulas/[id]/route.ts` can remain as-is for now (old data).

No changes needed — the new system uses `/api/formula-entries` and `/api/formulas/parse`. The old routes are inert.

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors. If there are errors related to old formula pages being deleted but still referenced, fix the imports.

**Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any TypeScript errors from formulas redesign"
```

---

### Task 15: Build Verification & Manual Testing

**Step 1: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Run dev server and test manually**

Run: `npm run dev`

Test checklist:
- [ ] Sidebar shows "Log Formula" instead of "Formulas"
- [ ] `/app/formulas` shows the notepad page with client picker, service type dropdown, date, and textareas
- [ ] Client picker search works
- [ ] Service types auto-seed on first load (8 defaults)
- [ ] Saving a formula works (raw notes stored)
- [ ] AI parsing triggers after save (check network tab for `/api/formulas/parse`)
- [ ] Redirect to client profile after save
- [ ] Client profile shows formula history accordion grouped by service type
- [ ] Accordion expands/collapses
- [ ] Raw notes toggle works
- [ ] Parsed bowls display correctly
- [ ] General notes show in amber styling
- [ ] Settings page shows Service Types section
- [ ] Can add, rename, delete service types in Settings
- [ ] Old formula pages (e.g., `/app/formulas/123`) return 404

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete formulas redesign — smart notepad with AI parsing"
```

---

## Summary of All Files

### Created:
- `migrations/2026-02-16-formula-entries.sql`
- `src/lib/db/service-types.ts`
- `src/lib/db/formula-entries.ts`
- `src/app/api/service-types/route.ts`
- `src/app/api/service-types/[id]/route.ts`
- `src/app/api/service-types/seed/route.ts`
- `src/app/api/formula-entries/route.ts`
- `src/app/api/formula-entries/[id]/route.ts`
- `src/app/api/formulas/parse/route.ts`
- `src/app/app/formulas/_components/ClientPicker.tsx`
- `src/app/app/clients/[id]/_components/FormulaHistory.tsx`
- `src/app/app/settings/_components/ServiceTypesManager.tsx`

### Modified:
- `package.json` (add @anthropic-ai/sdk)
- `src/lib/types.ts` (add new types, deprecate old)
- `src/app/app/_components/AppNav.tsx` (rename nav item)
- `src/app/app/formulas/page.tsx` (complete rewrite)
- `src/app/app/clients/[id]/page.tsx` (formula section redesign)
- `src/app/app/settings/page.tsx` (add service types card)

### Deleted:
- `src/app/app/formulas/new/page.tsx`
- `src/app/app/formulas/[id]/page.tsx`
- `src/app/app/formulas/[id]/edit/page.tsx`
- `src/app/app/formulas/[id]/_components/FormulaActions.tsx`
