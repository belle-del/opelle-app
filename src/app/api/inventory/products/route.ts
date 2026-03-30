import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

    // Update inventory-specific columns if provided
    if (sku || unitOfMeasure || retailPrice || reorderQuantity) {
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
    console.error("Create inventory product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
