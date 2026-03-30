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

    // NOTE: Stock deductions are not atomic (read-then-write). For a school environment
    // with low concurrency this is acceptable. If concurrent completions become an issue,
    // replace with a Postgres RPC using UPDATE ... RETURNING for atomic decrement.
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

      const previousStock = Number(product.quantity) || 0;
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

      // Check for low-stock / out-of-stock alert (skip if no threshold configured)
      const threshold = Number(product.low_stock_threshold) || 0;
      if (threshold > 0 && newStock <= threshold) {
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
