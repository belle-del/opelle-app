# Inventory Management System — Design Doc
**Date:** 2026-03-30
**Module:** 5 (Build Bible)
**Status:** Approved

---

## Overview

Build the complete inventory system for Opelle: product stock tracking, auto-deduction on service completion, movement audit trail, and low-stock alerting. This implements Build Bible Module 5 and plugs the Rule 9 inventory deduction gap.

---

## Schema Changes

### Evolve existing `products` table

Add columns via migration (no renames — `quantity` = current stock, `low_stock_threshold` = par level):

```sql
ALTER TABLE products
  ADD COLUMN sku VARCHAR(50),
  ADD COLUMN unit_of_measure VARCHAR(20) DEFAULT 'pieces',
  ADD COLUMN unit_cost DECIMAL(10,4),
  ADD COLUMN retail_price DECIMAL(10,2),
  ADD COLUMN reorder_quantity DECIMAL(10,2),
  ADD COLUMN active BOOLEAN DEFAULT true;
```

### New tables

**`stock_movements`** — immutable audit trail for every quantity change:
```sql
workspace_id, product_id, movement_type VARCHAR(30),
-- 'service_deduct' | 'manual_adjust' | 'received' | 'waste' | 'return'
quantity_change DECIMAL(10,2),  -- positive or negative
previous_stock DECIMAL(10,2), new_stock DECIMAL(10,2),
service_completion_id UUID (nullable FK),
notes TEXT, created_by UUID, created_at TIMESTAMPTZ
```

**`service_product_usage`** — templates mapping service categories to products:
```sql
workspace_id, service_category_id UUID FK,
product_id UUID FK, estimated_quantity DECIMAL(10,2),
is_required BOOLEAN DEFAULT true,
UNIQUE(workspace_id, service_category_id, product_id)
```

**`stock_alerts`** — low/out-of-stock alert records:
```sql
workspace_id, product_id UUID FK,
alert_type VARCHAR(30),  -- 'low_stock' | 'out_of_stock'
triggered_at TIMESTAMPTZ DEFAULT NOW(),
acknowledged_at TIMESTAMPTZ (nullable),
acknowledged_by UUID (nullable)
```

All three new tables get RLS enabled with standard workspace-owner policies matching existing patterns.

---

## Auto-Deduction Flow

Plugged into `/api/services/complete` after existing curriculum tracking step:

1. Query `service_product_usage` for the completed service's `category_id`
2. For each usage record:
   - Fetch current product stock
   - Compute `new_stock = current - estimated_quantity` (floor at 0)
   - Insert `stock_movements` row (type: `service_deduct`)
   - Update `products.quantity` to new stock
   - If `new_stock <= low_stock_threshold`: insert `stock_alerts` row + fire `inventory.low_stock` kernel event
3. Returns `completionId` as before — inventory deduction is transparent to caller

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/inventory` | Dashboard summary: totals, alerts, category breakdown, total value |
| `POST` | `/api/inventory/products` | Add product (wraps existing create logic) |
| `PATCH` | `/api/inventory/products/:id` | Update product metadata |
| `POST` | `/api/inventory/adjust` | Manual stock adjustment with reason; creates movement record |
| `GET` | `/api/inventory/alerts` | Active (unacknowledged) alerts |
| `PATCH` | `/api/inventory/alerts/:id/acknowledge` | Dismiss an alert |
| `GET` | `/api/inventory/movements` | Movement history; optional `?product_id=` filter |

---

## UI

**Inventory Dashboard** — enhance existing `/app/products` page:

- **Summary bar**: total products · low stock count (garnet if > 0) · out of stock count · total inventory value
- **Alert banner**: collapsible list of low/out-of-stock items if any exist
- **Product list**: existing list + stock level column; low-stock rows highlighted garnet
- **Quick Adjust modal**: click any product → modal with current stock, ±adjustment input, reason dropdown (counted, waste, received, other), saves via `POST /api/inventory/adjust`
- **Movement history**: per-product drawer or `/app/products/[id]` tab showing `stock_movements` for that product

Design follows existing Opelle palette — garnet for alerts, brass for highlights, Fraunces/DM Sans fonts.

---

## Integration Points

1. **`/api/services/complete`** — add deduction step (Step 3 of Rule 9)
2. **`adjustProductQuantity()` in `lib/db/products.ts`** — update to also create `stock_movements` records for manual adjustments
3. **Kernel events** — `inventory.low_stock` event already defined; fire it from the new deduction logic

---

## What's Out of Scope

- Purchase order / receive flow (`POST /api/inventory/receive`) — Build Bible lists it but not in user's request
- Usage analytics endpoint (`GET /api/inventory/usage`) — Phase 2
- Vendor table — not required for student cosmetology context
- Barcode scanning integration changes — existing scanner unchanged
