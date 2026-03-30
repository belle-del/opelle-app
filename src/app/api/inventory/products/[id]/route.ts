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

    const inventoryUpdate: Record<string, unknown> = {};
    if (sku !== undefined) inventoryUpdate.sku = sku || null;
    if (unitOfMeasure !== undefined) inventoryUpdate.unit_of_measure = unitOfMeasure;
    if (retailPrice !== undefined) inventoryUpdate.retail_price = retailPrice || null;
    if (reorderQuantity !== undefined) inventoryUpdate.reorder_quantity = reorderQuantity || null;
    if (active !== undefined) inventoryUpdate.active = active;

    if (Object.keys(inventoryUpdate).length > 0) {
      const admin = createSupabaseAdminClient();
      await admin.from("products").update(inventoryUpdate).eq("id", id).eq("workspace_id", workspaceId);
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    console.error("Update inventory product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
