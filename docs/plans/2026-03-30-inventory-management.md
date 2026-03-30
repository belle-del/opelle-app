# Inventory Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Module 5 inventory system — product stock tracking, auto-deduction on service completion, movement audit trail, low-stock alerting, and inventory dashboard UI.

**Architecture:** Evolve the existing `products` table with new columns (sku, unit_cost, retail_price, etc.), add three new tables (stock_movements, service_product_usage, stock_alerts), plug deduction logic into the service completion API route, and enhance the existing products UI with summary stats, alerts, and a quick-adjust modal.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + RLS), Supabase admin client (bypasses RLS in API routes), Tailwind CSS, Lucide React icons, Fraunces/DM Sans/Cormorant Garamond fonts.

**No test framework exists** — verification uses curl and browser checks.

---

## Context You Must Know

- **Admin client pattern:** All API routes use `createSupabaseAdminClient()` from `@/lib/supabase/admin` — this bypasses RLS. Auth check comes first with `createSupabaseServerClient()`.
- **Workspace tenancy:** Every table has `workspace_id`. Get it via `getWorkspaceId(user.id)` from `@/lib/db/get-workspace-id`.
- **Kernel events:** Fire-and-forget async calls via `publishEvent()` from `@/lib/kernel`. Never await inside a response path.
- **Existing products table** uses `quantity` (= current stock) and `low_stock_threshold` (= par level). Do NOT rename these — new code aliases them.
- **RLS pattern:** Every new table needs `ALTER TABLE x ENABLE ROW LEVEL SECURITY` + a policy checking `workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())`.
- **Types file:** All DB row types and model types live in `src/lib/types.ts`. Add new types there.
- **Design doc:** `docs/plans/2026-03-30-inventory-management-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/2026-03-30-inventory-management.sql`

**Step 1: Write the migration file**

```sql
-- migrations/2026-03-30-inventory-management.sql

-- 1. Evolve products table with inventory-specific columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'pieces',
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reorder_quantity DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true NOT NULL;

-- 2. Stock movements — immutable audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  -- 'service_deduct' | 'manual_adjust' | 'received' | 'waste' | 'return'
  quantity_change DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2) NOT NULL,
  new_stock DECIMAL(10,2) NOT NULL,
  service_completion_id UUID REFERENCES service_completions(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_stock_movements" ON stock_movements
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 3. Service product usage templates
CREATE TABLE IF NOT EXISTS service_product_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  estimated_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  is_required BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(workspace_id, service_category_id, product_id)
);

ALTER TABLE service_product_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_service_product_usage" ON service_product_usage
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 4. Stock alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  alert_type VARCHAR(30) NOT NULL,
  -- 'low_stock' | 'out_of_stock'
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID
);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_stock_alerts" ON stock_alerts
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Index for fast alert lookups
CREATE INDEX IF NOT EXISTS idx_stock_alerts_workspace_product
  ON stock_alerts(workspace_id, product_id)
  WHERE acknowledged_at IS NULL;

-- Index for movement history
CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON stock_movements(product_id, created_at DESC);
```

**Step 2: Run the migration in Supabase**

Open Supabase dashboard → SQL editor → paste the full file → Run.

Or if using the CLI:
```bash
supabase db push
```

Verify the three new tables appear in the Table Editor.

**Step 3: Commit**

```bash
git add migrations/2026-03-30-inventory-management.sql
git commit -m "feat(db): add inventory management tables and product columns"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts` (append after the existing `ProductRow` block around line 430)

**Step 1: Add row types and model types**

Find the `ProductRow` type (line ~411) and `productRowToModel` function (line ~549) in `types.ts`. After the `productRowToModel` function, append:

```typescript
// ─── Inventory Management Types ───────────────────────────────────────────

export type StockMovementType = 'service_deduct' | 'manual_adjust' | 'received' | 'waste' | 'return';

export type StockMovementRow = {
  id: string;
  workspace_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  service_completion_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  workspaceId: string;
  productId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  serviceCompletionId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function stockMovementRowToModel(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    productId: row.product_id,
    movementType: row.movement_type,
    quantityChange: row.quantity_change,
    previousStock: row.previous_stock,
    newStock: row.new_stock,
    serviceCompletionId: row.service_completion_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export type StockAlertType = 'low_stock' | 'out_of_stock';

export type StockAlertRow = {
  id: string;
  workspace_id: string;
  product_id: string;
  alert_type: StockAlertType;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export type StockAlert = {
  id: string;
  workspaceId: string;
  productId: string;
  alertType: StockAlertType;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

export function stockAlertRowToModel(row: StockAlertRow): StockAlert {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    productId: row.product_id,
    alertType: row.alert_type,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
  };
}

export type ServiceProductUsageRow = {
  id: string;
  workspace_id: string;
  service_category_id: string;
  product_id: string;
  estimated_quantity: number;
  is_required: boolean;
};

export type ServiceProductUsage = {
  id: string;
  workspaceId: string;
  serviceCategoryId: string;
  productId: string;
  estimatedQuantity: number;
  isRequired: boolean;
};
```

Also update `ProductRow` to add the new optional columns (find the `ProductRow` type at line ~411):

```typescript
// Add these fields to the existing ProductRow type:
  sku: string | null;
  unit_of_measure: string | null;
  unit_cost: number | null;
  retail_price: number | null;
  reorder_quantity: number | null;
  active: boolean;
```

And update the `Product` model type (line ~107) to add:

```typescript
// Add these fields to the existing Product type:
  sku?: string;
  unitOfMeasure?: string;
  unitCost?: number;
  retailPrice?: number;
  reorderQuantity?: number;
  active: boolean;
```

And update `productRowToModel` to map the new fields:

```typescript
// Add to the existing productRowToModel return object:
    sku: row.sku ?? undefined,
    unitOfMeasure: row.unit_of_measure ?? undefined,
    unitCost: row.unit_cost ?? undefined,
    retailPrice: row.retail_price ?? undefined,
    reorderQuantity: row.reorder_quantity ?? undefined,
    active: row.active ?? true,
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to your changes).

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add inventory management types (StockMovement, StockAlert, ServiceProductUsage)"
```

---

## Task 3: Inventory DB Helper Module

**Files:**
- Create: `src/lib/db/inventory.ts`

**Step 1: Write the module**

```typescript
// src/lib/db/inventory.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "./workspaces";
import {
  StockMovement, StockMovementRow, StockMovementType, stockMovementRowToModel,
  StockAlert, StockAlertRow, StockAlertType, stockAlertRowToModel,
  ServiceProductUsage, ServiceProductUsageRow,
} from "@/lib/types";

async function resolveWorkspaceId(): Promise<string | undefined> {
  const workspace = await getCurrentWorkspace();
  if (workspace) return workspace.id;
  const admin = createSupabaseAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
  return ws?.id;
}

// ─── Stock Movements ──────────────────────────────────────────────────────

export async function createStockMovement(input: {
  workspaceId: string;
  productId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  serviceCompletionId?: string;
  notes?: string;
  createdBy?: string;
}): Promise<StockMovement | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stock_movements")
    .insert({
      workspace_id: input.workspaceId,
      product_id: input.productId,
      movement_type: input.movementType,
      quantity_change: input.quantityChange,
      previous_stock: input.previousStock,
      new_stock: input.newStock,
      service_completion_id: input.serviceCompletionId ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return stockMovementRowToModel(data as StockMovementRow);
}

export async function listMovements(options?: {
  productId?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("stock_movements")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.productId) {
    query = query.eq("product_id", options.productId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as StockMovementRow[]).map(stockMovementRowToModel);
}

// ─── Stock Alerts ─────────────────────────────────────────────────────────

export async function upsertStockAlert(input: {
  workspaceId: string;
  productId: string;
  alertType: StockAlertType;
}): Promise<StockAlert | null> {
  const admin = createSupabaseAdminClient();

  // Check for existing unacknowledged alert of same type
  const { data: existing } = await admin
    .from("stock_alerts")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("product_id", input.productId)
    .eq("alert_type", input.alertType)
    .is("acknowledged_at", null)
    .single();

  if (existing) {
    // Already have an active alert — don't duplicate
    const { data } = await admin
      .from("stock_alerts")
      .select("*")
      .eq("id", existing.id)
      .single();
    return data ? stockAlertRowToModel(data as StockAlertRow) : null;
  }

  const { data, error } = await admin
    .from("stock_alerts")
    .insert({
      workspace_id: input.workspaceId,
      product_id: input.productId,
      alert_type: input.alertType,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return stockAlertRowToModel(data as StockAlertRow);
}

export async function listActiveAlerts(): Promise<StockAlert[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stock_alerts")
    .select("*")
    .eq("workspace_id", wsId)
    .is("acknowledged_at", null)
    .order("triggered_at", { ascending: false });

  if (error || !data) return [];
  return (data as StockAlertRow[]).map(stockAlertRowToModel);
}

export async function acknowledgeAlert(
  id: string,
  userId: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("stock_alerts")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    .eq("id", id)
    .eq("workspace_id", wsId);

  return !error;
}

// ─── Service Product Usage ────────────────────────────────────────────────

export async function listServiceProductUsage(
  serviceCategoryId: string,
  workspaceId: string
): Promise<ServiceProductUsage[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_product_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("service_category_id", serviceCategoryId);

  if (error || !data) return [];
  return (data as ServiceProductUsageRow[]).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    serviceCategoryId: row.service_category_id,
    productId: row.product_id,
    estimatedQuantity: row.estimated_quantity,
    isRequired: row.is_required,
  }));
}

export async function upsertServiceProductUsage(input: {
  workspaceId: string;
  serviceCategoryId: string;
  productId: string;
  estimatedQuantity: number;
  isRequired?: boolean;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("service_product_usage")
    .upsert(
      {
        workspace_id: input.workspaceId,
        service_category_id: input.serviceCategoryId,
        product_id: input.productId,
        estimated_quantity: input.estimatedQuantity,
        is_required: input.isRequired ?? true,
      },
      { onConflict: "workspace_id,service_category_id,product_id" }
    );

  return !error;
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add src/lib/db/inventory.ts
git commit -m "feat(db): add inventory helper module (movements, alerts, service usage)"
```

---

## Task 4: Auto-Deduction in Service Completion

**Files:**
- Modify: `src/app/api/services/complete/route.ts`

This is Rule 9, Step 3: deduct inventory when a service is completed.

**Step 1: Update the route**

Replace the entire file content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createStockMovement, upsertStockAlert, listServiceProductUsage } from "@/lib/db/inventory";
import { publishEvent } from "@/lib/kernel";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { studentId, studentName, categoryId, clientId, notes } = await req.json();
    if (!studentId || !categoryId) {
      return NextResponse.json({ error: "studentId and categoryId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // 1. Insert service completion
    const { data: completion, error: insertError } = await admin
      .from("service_completions")
      .insert({
        workspace_id: workspaceId,
        student_id: studentId,
        student_name: studentName || "",
        category_id: categoryId,
        client_id: clientId || null,
        completed_at: now,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Service completion insert error:", insertError);
      return NextResponse.json({ error: "Failed to log completion" }, { status: 500 });
    }

    // 2. Upsert curriculum progress
    const { data: existing } = await admin
      .from("curriculum_progress")
      .select("id, completed_count")
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId)
      .eq("category_id", categoryId)
      .single();

    if (existing) {
      await admin
        .from("curriculum_progress")
        .update({
          completed_count: (existing.completed_count || 0) + 1,
          last_completed_at: now,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("curriculum_progress").insert({
        workspace_id: workspaceId,
        student_id: studentId,
        category_id: categoryId,
        completed_count: 1,
        last_completed_at: now,
      });
    }

    // 3. Inventory deduction (Rule 9, Step 3)
    const usageTemplates = await listServiceProductUsage(categoryId, workspaceId);

    for (const usage of usageTemplates) {
      // Fetch current product stock
      const { data: product } = await admin
        .from("products")
        .select("id, quantity, low_stock_threshold, brand, shade")
        .eq("id", usage.productId)
        .eq("workspace_id", workspaceId)
        .single();

      if (!product) continue;

      const previousStock = product.quantity as number;
      const newStock = Math.max(0, previousStock - usage.estimatedQuantity);

      // Deduct from product
      await admin
        .from("products")
        .update({ quantity: newStock, updated_at: now })
        .eq("id", usage.productId);

      // Create movement record
      await createStockMovement({
        workspaceId,
        productId: usage.productId,
        movementType: "service_deduct",
        quantityChange: -(usage.estimatedQuantity),
        previousStock,
        newStock,
        serviceCompletionId: completion?.id,
        createdBy: user.id,
      });

      // Check for low-stock / out-of-stock alert
      const threshold = product.low_stock_threshold as number;
      if (newStock <= threshold) {
        const alertType = newStock === 0 ? "out_of_stock" : "low_stock";
        await upsertStockAlert({ workspaceId, productId: usage.productId, alertType });

        // Fire kernel event (non-blocking)
        publishEvent({
          event_type: "inventory.low_stock",
          workspace_id: workspaceId,
          timestamp: now,
          payload: {
            product_id: usage.productId,
            brand: product.brand,
            shade: product.shade,
            quantity: newStock,
            low_stock_threshold: threshold,
            alert_type: alertType,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      completionId: completion?.id,
    });
  } catch (err) {
    console.error("Service complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Smoke-test via curl**

Start the dev server (`npm run dev`), then:

```bash
# First, get a valid studentId, categoryId from the Supabase dashboard
# Then test the completion endpoint (replace with real IDs)
curl -X POST http://localhost:3000/api/services/complete \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<student-id>","studentName":"Test","categoryId":"<category-id>"}' \
  -b "<your-session-cookie>"
```

Expected: `{"success":true,"completionId":"..."}`. Check Supabase → `stock_movements` table for a new row (if usage templates exist for that category).

**Step 4: Commit**

```bash
git add src/app/api/services/complete/route.ts
git commit -m "feat(services): add inventory auto-deduction to service completion (Rule 9 Step 3)"
```

---

## Task 5: GET /api/inventory (Dashboard Summary)

**Files:**
- Create: `src/app/api/inventory/route.ts`

**Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listActiveAlerts } from "@/lib/db/inventory";
import type { ProductRow } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    // Fetch all active products
    const { data: products, error } = await admin
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    const rows = (products ?? []) as ProductRow[];

    // Compute summary
    const lowStockItems = rows.filter(
      (p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold
    );
    const outOfStockItems = rows.filter((p) => p.quantity <= 0);

    // Total value: cost_cents * quantity (fall back to unit_cost)
    const totalValueCents = rows.reduce((sum, p) => {
      const costCents = p.cost_cents ?? (p.unit_cost ? Math.round(p.unit_cost * 100) : 0);
      return sum + costCents * p.quantity;
    }, 0);

    // Category breakdown (using existing category field)
    const categoryBreakdown: Record<string, { count: number; value: number }> = {};
    for (const p of rows) {
      const cat = p.category || "other";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, value: 0 };
      categoryBreakdown[cat].count += 1;
      const costCents = p.cost_cents ?? (p.unit_cost ? Math.round(p.unit_cost * 100) : 0);
      categoryBreakdown[cat].value += costCents * p.quantity;
    }

    const activeAlerts = await listActiveAlerts();

    return NextResponse.json({
      summary: {
        total_products: rows.length,
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockItems.length,
        total_value_cents: totalValueCents,
      },
      alerts: activeAlerts,
      categories: categoryBreakdown,
    });
  } catch (err) {
    console.error("Inventory dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify with curl**

```bash
curl http://localhost:3000/api/inventory \
  -b "<your-session-cookie>"
```

Expected: JSON with `summary`, `alerts`, `categories` keys.

**Step 3: Commit**

```bash
git add src/app/api/inventory/route.ts
git commit -m "feat(api): add GET /api/inventory dashboard summary endpoint"
```

---

## Task 6: PATCH /api/inventory/products/:id and POST /api/inventory/products

**Files:**
- Create: `src/app/api/inventory/products/route.ts`
- Create: `src/app/api/inventory/products/[id]/route.ts`

**Step 1: Write POST /api/inventory/products**

```typescript
// src/app/api/inventory/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createProduct } from "@/lib/db/products";
import type { ProductCategory } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    const { name, brand, shade, sku, category, unitOfMeasure, unitCost, retailPrice,
            currentStock, parLevel, reorderQuantity, barcode, notes } = body;

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const product = await createProduct({
      brand: brand || "Unknown",
      shade: shade || name || "Unknown",
      name: name || undefined,
      category: category as ProductCategory,
      barcode: barcode || undefined,
      quantity: currentStock ?? 0,
      lowStockThreshold: parLevel ?? 2,
      notes: notes || undefined,
      costCents: unitCost ? Math.round(unitCost * 100) : undefined,
    });

    if (!product) {
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }

    // Update new inventory-specific fields if provided
    if (sku || unitOfMeasure || retailPrice || reorderQuantity) {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const admin = createSupabaseAdminClient();
      await admin.from("products").update({
        sku: sku || null,
        unit_of_measure: unitOfMeasure || "pieces",
        retail_price: retailPrice || null,
        reorder_quantity: reorderQuantity || null,
      }).eq("id", product.id);
    }

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Write PATCH /api/inventory/products/:id**

```typescript
// src/app/api/inventory/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { updateProduct } from "@/lib/db/products";
import type { ProductCategory } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    const { brand, shade, name, sku, category, unitOfMeasure, unitCost, retailPrice,
            currentStock, parLevel, reorderQuantity, barcode, notes, active } = body;

    // Update core fields via existing helper
    const updated = await updateProduct(id, {
      brand: brand || undefined,
      shade: shade || undefined,
      name: name || undefined,
      category: category as ProductCategory | undefined,
      barcode: barcode || undefined,
      quantity: currentStock !== undefined ? currentStock : undefined,
      lowStockThreshold: parLevel !== undefined ? parLevel : undefined,
      notes: notes || undefined,
      costCents: unitCost !== undefined ? Math.round(unitCost * 100) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update new inventory columns
    const admin = createSupabaseAdminClient();
    const inventoryUpdate: Record<string, unknown> = {};
    if (sku !== undefined) inventoryUpdate.sku = sku || null;
    if (unitOfMeasure !== undefined) inventoryUpdate.unit_of_measure = unitOfMeasure;
    if (retailPrice !== undefined) inventoryUpdate.retail_price = retailPrice || null;
    if (reorderQuantity !== undefined) inventoryUpdate.reorder_quantity = reorderQuantity || null;
    if (active !== undefined) inventoryUpdate.active = active;

    if (Object.keys(inventoryUpdate).length > 0) {
      await admin.from("products").update(inventoryUpdate).eq("id", id).eq("workspace_id", workspaceId);
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    console.error("Update product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/api/inventory/products/
git commit -m "feat(api): add POST /api/inventory/products and PATCH /api/inventory/products/:id"
```

---

## Task 7: POST /api/inventory/adjust

**Files:**
- Create: `src/app/api/inventory/adjust/route.ts`

Manual stock adjustment (counted stock, waste, received shipment, etc.)

**Step 1: Write the route**

```typescript
// src/app/api/inventory/adjust/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createStockMovement, upsertStockAlert } from "@/lib/db/inventory";
import { publishEvent } from "@/lib/kernel";
import type { StockMovementType } from "@/lib/types";

const VALID_REASONS: StockMovementType[] = [
  "manual_adjust", "received", "waste", "return",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    const { product_id, adjustment, reason, notes } = body;

    if (!product_id || adjustment === undefined || adjustment === null) {
      return NextResponse.json(
        { error: "product_id and adjustment are required" },
        { status: 400 }
      );
    }

    const movementType: StockMovementType =
      VALID_REASONS.includes(reason) ? reason : "manual_adjust";

    const admin = createSupabaseAdminClient();

    // Fetch current product
    const { data: product, error: fetchError } = await admin
      .from("products")
      .select("id, quantity, low_stock_threshold, brand, shade, workspace_id")
      .eq("id", product_id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.quantity as number;
    const newStock = Math.max(0, previousStock + Number(adjustment));
    const now = new Date().toISOString();

    // Update product quantity
    const { error: updateError } = await admin
      .from("products")
      .update({ quantity: newStock, updated_at: now })
      .eq("id", product_id)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }

    // Create movement record
    const movement = await createStockMovement({
      workspaceId,
      productId: product_id,
      movementType,
      quantityChange: Number(adjustment),
      previousStock,
      newStock,
      notes: notes || undefined,
      createdBy: user.id,
    });

    // Check low stock after adjustment
    const threshold = product.low_stock_threshold as number;
    if (newStock <= threshold && Number(adjustment) < 0) {
      const alertType = newStock === 0 ? "out_of_stock" : "low_stock";
      await upsertStockAlert({ workspaceId, productId: product_id, alertType });

      publishEvent({
        event_type: "inventory.low_stock",
        workspace_id: workspaceId,
        timestamp: now,
        payload: {
          product_id,
          brand: product.brand,
          shade: product.shade,
          quantity: newStock,
          low_stock_threshold: threshold,
          alert_type: alertType,
        },
      });
    }

    return NextResponse.json({ success: true, movement, newStock });
  } catch (err) {
    console.error("Adjust stock error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/api/inventory/adjust/route.ts
git commit -m "feat(api): add POST /api/inventory/adjust for manual stock adjustments"
```

---

## Task 8: Alerts and Movements Endpoints

**Files:**
- Create: `src/app/api/inventory/alerts/route.ts`
- Create: `src/app/api/inventory/alerts/[id]/acknowledge/route.ts`
- Create: `src/app/api/inventory/movements/route.ts`

**Step 1: Write GET /api/inventory/alerts**

```typescript
// src/app/api/inventory/alerts/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listActiveAlerts } from "@/lib/db/inventory";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const alerts = await listActiveAlerts();
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("List alerts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Write PATCH /api/inventory/alerts/:id/acknowledge**

```typescript
// src/app/api/inventory/alerts/[id]/acknowledge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { acknowledgeAlert } from "@/lib/db/inventory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const ok = await acknowledgeAlert(id, user.id);
    if (!ok) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Acknowledge alert error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Write GET /api/inventory/movements**

```typescript
// src/app/api/inventory/movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listMovements } from "@/lib/db/inventory";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "100");

    const movements = await listMovements({ productId, limit });
    return NextResponse.json({ movements });
  } catch (err) {
    console.error("List movements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/api/inventory/alerts/ src/app/api/inventory/movements/
git commit -m "feat(api): add alerts and movements endpoints (GET, PATCH acknowledge)"
```

---

## Task 9: Inventory Dashboard UI — Summary Bar and Alert Banner

**Files:**
- Modify: `src/app/app/products/page.tsx`
- Create: `src/app/app/products/_components/InventorySummaryBar.tsx`
- Create: `src/app/app/products/_components/AlertBanner.tsx`

The existing `page.tsx` is a server component. We'll add summary data from the new `/api/inventory` logic (call DB helpers directly, not the API route) and render new components.

**Step 1: Create InventorySummaryBar component**

```tsx
// src/app/app/products/_components/InventorySummaryBar.tsx
interface SummaryBarProps {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValueCents: number;
}

export function InventorySummaryBar({
  totalProducts,
  lowStockCount,
  outOfStockCount,
  totalValueCents,
}: SummaryBarProps) {
  const totalValue = (totalValueCents / 100).toFixed(2);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "12px",
      marginBottom: "24px",
    }}>
      {[
        { label: "Total Products", value: totalProducts, color: "var(--text-on-stone)" },
        {
          label: "Low Stock",
          value: lowStockCount,
          color: lowStockCount > 0 ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
        },
        {
          label: "Out of Stock",
          value: outOfStockCount,
          color: outOfStockCount > 0 ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
        },
        { label: "Inventory Value", value: `$${totalValue}`, color: "var(--brass, #C4AB70)" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: "var(--card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
            borderRadius: "10px",
            padding: "14px 16px",
          }}
        >
          <p style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", marginBottom: "6px" }}>
            {label}
          </p>
          <p style={{ fontSize: "22px", fontFamily: "'Fraunces', serif", fontWeight: 300, color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create AlertBanner component**

```tsx
// src/app/app/products/_components/AlertBanner.tsx
"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { StockAlert } from "@/lib/types";

interface AlertBannerProps {
  alerts: StockAlert[];
  productNames: Record<string, string>; // productId -> display name
}

export function AlertBanner({ alerts, productNames }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  return (
    <div style={{
      background: "rgba(139,58,58,0.12)",
      border: "1px solid rgba(139,58,58,0.35)",
      borderRadius: "10px",
      padding: "12px 16px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    }}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-garnet, #8B3A3A)" }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-garnet, #8B3A3A)", marginBottom: "4px" }}>
          {alerts.length} item{alerts.length !== 1 ? "s" : ""} need attention
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <span style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "20px",
                background: "rgba(139,58,58,0.15)",
                color: "var(--color-garnet, #8B3A3A)",
                border: "1px solid rgba(139,58,58,0.25)",
              }}>
                {productNames[alert.productId] ?? alert.productId} — {alert.alertType === "out_of_stock" ? "Out of stock" : "Low stock"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
      >
        <X className="w-4 h-4" style={{ color: "var(--text-on-stone-faint)" }} />
      </button>
    </div>
  );
}
```

**Step 3: Update the products page**

Replace `src/app/app/products/page.tsx` with:

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/lib/db/products";
import { listActiveAlerts } from "@/lib/db/inventory";
import { formatDate } from "@/lib/utils";
import { Plus, Package, ChevronRight } from "lucide-react";
import { InventorySummaryBar } from "./_components/InventorySummaryBar";
import { AlertBanner } from "./_components/AlertBanner";
import { QuickAdjustButton } from "./_components/QuickAdjustButton";

const categoryLabels: Record<string, string> = {
  permanent: "Permanent",
  "demi-permanent": "Demi-Permanent",
  "semi-permanent": "Semi-Permanent",
  lightener: "Lightener",
  toner: "Toner",
  developer: "Developer",
  additive: "Additive",
  other: "Other",
};

export default async function ProductsPage() {
  const [products, activeAlerts] = await Promise.all([
    listProducts(),
    listActiveAlerts(),
  ]);

  const totalValueCents = products.reduce((sum, p) => {
    const cost = p.costCents ?? 0;
    return sum + cost * p.quantity;
  }, 0);

  const lowStockCount = products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold
  ).length;

  const outOfStockCount = products.filter((p) => p.quantity <= 0).length;

  // Build product name map for alert banner
  const productNames: Record<string, string> = {};
  for (const p of products) {
    productNames[p.id] = `${p.brand} ${p.shade}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
            Inventory
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
            Products
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-on-bark, #F5F0E8)", marginTop: "4px" }}>
            {products.length} {products.length === 1 ? "product" : "products"} in inventory
          </p>
        </div>
        <Link href="/app/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </header>

      {/* Summary Bar */}
      {products.length > 0 && (
        <InventorySummaryBar
          totalProducts={products.length}
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          totalValueCents={totalValueCents}
        />
      )}

      {/* Alert Banner */}
      <AlertBanner alerts={activeAlerts} productNames={productNames} />

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-on-stone-ghost)" }} />
            <h3 style={{ fontSize: "14px", fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)", fontWeight: 400, marginBottom: "8px" }}>No products yet</h3>
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "16px" }}>
              Add your color tubes and products to build formulas faster.
            </p>
            <Link href="/app/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isLow = product.quantity > 0 && product.quantity <= product.lowStockThreshold;
            const isOut = product.quantity <= 0;
            return (
              <Card
                key={product.id}
                style={{
                  marginBottom: "8px",
                  borderColor: isOut
                    ? "rgba(139,58,58,0.5)"
                    : isLow
                    ? "rgba(139,58,58,0.25)"
                    : undefined,
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/app/products/${product.id}`} className="flex items-center gap-3 flex-1">
                      <div
                        className="flex items-center justify-center"
                        style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--brass-glow)" }}
                      >
                        <Package className="w-4 h-4" style={{ color: "var(--brass-warm)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                          {product.brand} {product.shade}
                        </p>
                        <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                          {product.line || product.name || categoryLabels[product.category]}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass)" }}>
                        {categoryLabels[product.category] || product.category}
                      </span>
                      <Badge variant={isOut ? "danger" : isLow ? "danger" : "success"}>
                        {isOut ? "Out" : `Qty: ${product.quantity}`}
                      </Badge>
                      <QuickAdjustButton productId={product.id} productName={`${product.brand} ${product.shade}`} currentStock={product.quantity} />
                      <Link href={`/app/products/${product.id}`}>
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--text-on-stone-ghost)" }} />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Verify TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/app/products/
git commit -m "feat(ui): add inventory summary bar and alert banner to products page"
```

---

## Task 10: Quick Adjust Modal

**Files:**
- Create: `src/app/app/products/_components/QuickAdjustButton.tsx`

**Step 1: Write the component**

```tsx
// src/app/app/products/_components/QuickAdjustButton.tsx
"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface QuickAdjustButtonProps {
  productId: string;
  productName: string;
  currentStock: number;
}

const REASON_OPTIONS = [
  { value: "manual_adjust", label: "Count adjustment" },
  { value: "received", label: "Received stock" },
  { value: "waste", label: "Waste / damaged" },
  { value: "return", label: "Return" },
];

export function QuickAdjustButton({ productId, productName, currentStock }: QuickAdjustButtonProps) {
  const [open, setOpen] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("manual_adjust");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const adj = parseFloat(adjustment) || 0;
  const preview = Math.max(0, currentStock + adj);

  async function submit() {
    if (!adjustment || adj === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, adjustment: adj, reason, notes }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          setOpen(false);
          setDone(false);
          setAdjustment("");
          setNotes("");
          window.location.reload(); // refresh server component data
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
        title="Quick adjust"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-ghost)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "var(--card-bg-solid, #2C2820)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "380px",
              margin: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
                  Adjust Stock
                </p>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "16px", color: "var(--text-on-stone)", fontWeight: 400 }}>
                  {productName}
                </h3>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X className="w-4 h-4" style={{ color: "var(--text-on-stone-faint)" }} />
              </button>
            </div>

            {/* Current stock */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>Current</p>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text-on-stone)" }}>{currentStock}</p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>After</p>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: adj < 0 ? "var(--color-garnet, #8B3A3A)" : "var(--brass, #C4AB70)" }}>
                  {preview}
                </p>
              </div>
            </div>

            {/* Adjustment input */}
            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Adjustment (+/-)
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="-3 or +10"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-on-stone)",
                fontSize: "14px", marginBottom: "12px", boxSizing: "border-box",
              }}
            />

            {/* Reason */}
            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "var(--card-bg-solid, #2C2820)",
                color: "var(--text-on-stone)",
                fontSize: "13px", marginBottom: "12px", boxSizing: "border-box",
              }}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Notes */}
            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. physical count, expired product"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-on-stone)",
                fontSize: "13px", marginBottom: "20px", boxSizing: "border-box",
              }}
            />

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading || !adjustment || adj === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                background: done ? "#4A7C59" : "var(--color-garnet, #8B3A3A)",
                color: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading || !adjustment || adj === 0 ? 0.5 : 1,
                transition: "background 0.2s",
              }}
            >
              {done ? "Updated!" : loading ? "Saving..." : "Confirm Adjustment"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/app/products/_components/QuickAdjustButton.tsx
git commit -m "feat(ui): add QuickAdjustButton modal for inline stock adjustments"
```

---

## Task 11: Movement History in Product Detail

**Files:**
- Modify: `src/app/app/products/[id]/page.tsx` (add movement history section at the bottom)
- Create: `src/app/app/products/[id]/_components/MovementHistory.tsx`

**Step 1: Write MovementHistory component**

```tsx
// src/app/app/products/[id]/_components/MovementHistory.tsx
import type { StockMovement } from "@/lib/types";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";

interface MovementHistoryProps {
  movements: StockMovement[];
}

const typeLabels: Record<string, { label: string; direction: "in" | "out" | "neutral" }> = {
  service_deduct: { label: "Service used", direction: "out" },
  manual_adjust: { label: "Manual count", direction: "neutral" },
  received: { label: "Received", direction: "in" },
  waste: { label: "Waste", direction: "out" },
  return: { label: "Return", direction: "in" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MovementHistory({ movements }: MovementHistoryProps) {
  if (movements.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
        No stock movements yet
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {movements.map((m) => {
        const meta = typeLabels[m.movementType] ?? { label: m.movementType, direction: "neutral" as const };
        const isIn = meta.direction === "in" || m.quantityChange > 0;
        const isOut = meta.direction === "out" || m.quantityChange < 0;

        return (
          <div
            key={m.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: isIn ? "rgba(74,124,89,0.15)" : isOut ? "rgba(139,58,58,0.15)" : "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isIn
                  ? <ArrowUp className="w-3.5 h-3.5" style={{ color: "#4A7C59" }} />
                  : isOut
                  ? <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--color-garnet, #8B3A3A)" }} />
                  : <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-faint)" }} />
                }
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>{meta.label}</p>
                {m.notes && (
                  <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{m.notes}</p>
                )}
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{formatDate(m.createdAt)}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: "13px", fontFamily: "'Fraunces', serif",
                color: isIn ? "#4A7C59" : isOut ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
              }}>
                {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
              </p>
              <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                {m.previousStock} → {m.newStock}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Add movement history to product detail page**

In `src/app/app/products/[id]/page.tsx`, add these imports at the top:

```typescript
import { listMovements } from "@/lib/db/inventory";
import { MovementHistory } from "./_components/MovementHistory";
```

In the `ProductDetailPage` function, add this alongside the existing data fetches:

```typescript
const movements = await listMovements({ productId: id, limit: 50 });
```

Then add a section at the bottom of the page return (before the closing `</div>`):

```tsx
{/* Movement History */}
<Card>
  <CardHeader>
    <CardTitle>Stock History</CardTitle>
  </CardHeader>
  <CardContent>
    <MovementHistory movements={movements} />
  </CardContent>
</Card>
```

**Step 3: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/app/products/[id]/
git commit -m "feat(ui): add movement history to product detail page"
```

---

## Task 12: Final Verification

**Step 1: Full TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

**Step 2: Start dev server and smoke-test**

```bash
npm run dev
```

Open http://localhost:3000/app/products — verify:
- [ ] Summary bar shows (4 stat cards)
- [ ] Low stock products appear with garnet border
- [ ] Quick adjust button appears on each product row (slider icon)
- [ ] Clicking Quick Adjust opens modal
- [ ] Modal shows current stock and preview
- [ ] Submitting adjustment updates stock (page reloads with new value)

Open a product detail page — verify:
- [ ] "Stock History" section appears at bottom
- [ ] If movements exist, they list with direction arrows

**Step 3: Test alert banner**

Manually set a product's quantity to 0 in Supabase dashboard, then trigger it via the adjust endpoint:

```bash
curl -X POST http://localhost:3000/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{"product_id":"<id>","adjustment":-999,"reason":"manual_adjust"}' \
  -b "<session-cookie>"
```

Reload products page — alert banner should appear.

**Step 4: Test service completion deduction**

In Supabase: add a row to `service_product_usage` for a known `service_category_id` and `product_id`. Then complete a service via checkout. Check `stock_movements` table for the new `service_deduct` row.

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(inventory): complete Module 5 inventory management system

- DB: stock_movements, service_product_usage, stock_alerts tables
- API: /api/inventory, /api/inventory/adjust, /api/inventory/alerts, /api/inventory/movements
- Auto-deduction on service completion (Rule 9 Step 3)
- UI: summary bar, alert banner, quick adjust modal, movement history"
```
