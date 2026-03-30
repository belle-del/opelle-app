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

    const { data: product, error: fetchError } = await admin
      .from("products")
      .select("id, quantity, low_stock_threshold, brand, shade")
      .eq("id", product_id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = Number(product.quantity) || 0;
    const newStock = Math.max(0, previousStock + Number(adjustment));
    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("products")
      .update({ quantity: newStock, updated_at: now })
      .eq("id", product_id)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }

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

    const threshold = Number(product.low_stock_threshold) || 0;
    if (threshold > 0 && Number(adjustment) < 0 && newStock <= threshold) {
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
