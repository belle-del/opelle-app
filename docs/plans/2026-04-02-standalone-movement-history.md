# Standalone Movement History Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a standalone movement history page at `/app/products/movements` with product, type, and date range filters — accessible via a button on the inventory dashboard.

**Architecture:** Extend the existing `listMovements` DB function and `/api/inventory/movements` route with `movement_type` and date range filters. Create a new client-component page that fetches all movements across products and renders them with the product name shown per row. Reuse the `DateRangePicker` from reports and the existing `MovementHistory` row styling.

**Tech Stack:** Next.js App Router, Supabase (admin client), Lucide icons, CSS custom properties (Opelle design system)

---

### Task 1: Extend `listMovements` with type and date filters

**Files:**
- Modify: `src/lib/db/inventory.ts:51-74`

**Step 1: Update the function signature and query builder**

Add `movementType` and `startDate`/`endDate` optional params to `listMovements`. Apply them as `.eq` and `.gte`/`.lte` filters on the query.

```typescript
export async function listMovements(options?: {
  workspaceId?: string;
  productId?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const wsId = options?.workspaceId ?? await resolveWorkspaceId();
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
  if (options?.movementType) {
    query = query.eq("movement_type", options.movementType);
  }
  if (options?.startDate) {
    query = query.gte("created_at", options.startDate);
  }
  if (options?.endDate) {
    // Add one day to make endDate inclusive (end of day)
    query = query.lte("created_at", options.endDate + "T23:59:59.999Z");
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as StockMovementRow[]).map(stockMovementRowToModel);
}
```

**Step 2: Verify no callers break**

Existing callers pass `{ workspaceId, productId, limit }` — all still valid since the new params are optional.

**Step 3: Commit**

```bash
git add src/lib/db/inventory.ts
git commit -m "feat(inventory): add movement_type and date range filters to listMovements"
```

---

### Task 2: Extend the movements API route with new query params

**Files:**
- Modify: `src/app/api/inventory/movements/route.ts`

**Step 1: Parse the new query params and pass them through**

```typescript
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
    const movementType = searchParams.get("movement_type") ?? undefined;
    const startDate = searchParams.get("start_date") ?? undefined;
    const endDate = searchParams.get("end_date") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

    const movements = await listMovements({ workspaceId, productId, movementType, startDate, endDate, limit });
    return NextResponse.json({ movements });
  } catch (err) {
    console.error("List movements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/inventory/movements/route.ts
git commit -m "feat(inventory): expose movement_type and date filters on movements API"
```

---

### Task 3: Create the standalone movement history page

**Files:**
- Create: `src/app/app/products/movements/page.tsx`

**Context:**
- This is a **client component** (needs state for filters + fetch)
- Fetches from `GET /api/inventory/movements` with query params
- Also fetches product list from `GET /api/inventory` (or inline from server) to populate product filter dropdown and map `productId` → product name
- Uses `DateRangePicker` from `@/components/reports/DateRangePicker`
- Reuses the movement row styling from `MovementHistory` component (the type labels map + icon logic)
- Movement types for filter pills: `service_deduct`, `manual_adjust`, `received`, `waste`, `return`

**Step 1: Create the page file**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, RotateCcw, History } from "lucide-react";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import type { StockMovement, StockMovementType } from "@/lib/types";

type ProductOption = { id: string; label: string };

const typeLabels: Record<string, { label: string; direction: "in" | "out" | "neutral" }> = {
  service_deduct: { label: "Service used", direction: "out" },
  manual_adjust: { label: "Manual count", direction: "neutral" },
  received: { label: "Received", direction: "in" },
  waste: { label: "Waste", direction: "out" },
  return: { label: "Return", direction: "in" },
};

const MOVEMENT_TYPES: { key: StockMovementType; label: string }[] = [
  { key: "service_deduct", label: "Service" },
  { key: "manual_adjust", label: "Manual" },
  { key: "received", label: "Received" },
  { key: "waste", label: "Waste" },
  { key: "return", label: "Return" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<(StockMovement & { productName?: string })[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fetch product list for dropdown + name mapping
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts(
            data.products.map((p: { id: string; brand: string; shade: string }) => ({
              id: p.id,
              label: `${p.brand} ${p.shade}`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (selectedProduct) params.set("product_id", selectedProduct);
    if (selectedType) params.set("movement_type", selectedType);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    try {
      const res = await fetch(`/api/inventory/movements?${params}`);
      const data = await res.json();
      setMovements(data.movements ?? []);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, selectedType, startDate, endDate]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Build product name lookup
  const productNameMap: Record<string, string> = {};
  for (const p of products) {
    productNameMap[p.id] = p.label;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/app/products"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#6B5D4A" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div className="flex items-center gap-3">
          <History className="w-5 h-5" style={{ color: "var(--brass)" }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
            Movement History
          </h2>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date range */}
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

        {/* Product + Type filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Product dropdown */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              maxWidth: "200px",
            }}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {/* Movement type pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedType("")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "10px",
                letterSpacing: "0.05em",
                border: "1px solid var(--stone-mid)",
                background: selectedType === "" ? "var(--stone-mid)" : "transparent",
                color: "var(--text-on-stone)",
                cursor: "pointer",
              }}
            >
              All Types
            </button>
            {MOVEMENT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                  border: "1px solid var(--stone-mid)",
                  background: selectedType === t.key ? "var(--stone-mid)" : "transparent",
                  color: "var(--text-on-stone)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
          Loading movements...
        </p>
      ) : movements.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
          No movements found for the selected filters.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
            {movements.length} movement{movements.length !== 1 ? "s" : ""}
          </p>
          {movements.map((m) => {
            const meta = typeLabels[m.movementType] ?? { label: m.movementType, direction: "neutral" as const };
            const isIn = meta.direction === "in" || m.quantityChange > 0;
            const isOut = meta.direction === "out" || m.quantityChange < 0;
            const pName = productNameMap[m.productId] || "Unknown product";

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
                    <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                      {pName}
                    </p>
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                      {meta.label}{m.notes ? ` — ${m.notes}` : ""}
                    </p>
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
      )}
    </div>
  );
}
```

**Step 2: Verify the page loads**

Navigate to the live site `/app/products/movements` and confirm:
- Date range picker renders with 30d default
- Product dropdown loads product list
- Movement type pills render
- Movements list populates (or shows "No movements found" if empty)

**Step 3: Commit**

```bash
git add src/app/app/products/movements/page.tsx
git commit -m "feat(inventory): add standalone movement history page with filters"
```

---

### Task 4: Check the inventory API returns product data for the dropdown

**Files:**
- Read: `src/app/api/inventory/route.ts`

**Step 1: Verify the `/api/inventory` GET response includes a `products` array with `id`, `brand`, `shade`**

The movements page fetches from `/api/inventory` to populate the product dropdown. If the response doesn't include a products list, we need to either:
- Add it to that endpoint, or
- Fetch from a different endpoint (e.g., a dedicated products list API)

Read the file and verify. If it returns `{ products: [...] }` with `id`/`brand`/`shade`, no change needed. If not, fetch product list from the products page's server-side `listProducts` approach — but since this is a client component, we'd need a lightweight `/api/products` endpoint or add products to the inventory response.

**Step 2: If needed, create a minimal products list API or adjust the fetch**

If `/api/inventory` doesn't return products, change the movements page to fetch from an appropriate endpoint. Alternatively, if no products API exists, add a simple one.

**Step 3: Commit if changes were made**

```bash
git add <changed files>
git commit -m "fix(inventory): ensure movements page can fetch product list for dropdown"
```

---

### Task 5: Add "View All Movement History" button to the products page

**Files:**
- Modify: `src/app/app/products/page.tsx:1-11` (imports)
- Modify: `src/app/app/products/page.tsx:55-75` (header area)

**Step 1: Add the History import and link button**

Add to imports:
```typescript
import { Plus, Package, ChevronRight, History } from "lucide-react";
```

Add a "View All Movement History" link next to the existing "Add Product" button in the header:

```tsx
<header className="flex items-center justify-between">
  <div>
    <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A", marginBottom: "4px" }}>
      Inventory
    </p>
    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
      Products
    </h2>
    <p style={{ fontSize: "12px", color: "#7A7060", marginTop: "4px" }}>
      {products.length} {products.length === 1 ? "product" : "products"} in inventory
    </p>
  </div>
  <div className="flex items-center gap-2">
    <Link href="/app/products/movements">
      <Button variant="outline" size="sm">
        <History className="w-4 h-4 mr-2" />
        Movement History
      </Button>
    </Link>
    <Link href="/app/products/new">
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Add Product
      </Button>
    </Link>
  </div>
</header>
```

**Step 2: Verify on live site**

Navigate to `/app/products` and confirm:
- "Movement History" button appears next to "Add Product"
- Clicking it navigates to `/app/products/movements`
- Back link on movements page returns to `/app/products`

**Step 3: Commit**

```bash
git add src/app/app/products/page.tsx
git commit -m "feat(inventory): add Movement History button to products page header"
```

---

### Task 6: Push to GitHub (triggers Vercel deploy)

**Step 1: Push all commits**

```bash
git push origin HEAD
```

**Step 2: Verify on live Vercel deployment**

- Go to `/app/products` — "Movement History" button visible
- Click it — navigates to `/app/products/movements`
- Filters work: date range, product dropdown, type pills
- Movement rows show product name, type, quantity change, stock before/after
- Back link returns to products page
