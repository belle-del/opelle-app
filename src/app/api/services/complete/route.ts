import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createStockMovement, upsertStockAlert, listServiceProductUsage } from "@/lib/db/inventory";
import { publishEvent } from "@/lib/kernel";
import { fireAutomationsForTrigger } from "@/lib/marketing-triggers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const {
      studentId, studentName, categoryId, clientId, notes,
      beforePhotoUrl, afterPhotoUrl,
      formulaData, formulaEntryId,
    } = await req.json();
    if (!studentId || !categoryId) {
      return NextResponse.json({ error: "studentId and categoryId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // Rule 9, Step 4: Check if category requires photos (color/chemical services)
    const { data: category } = await admin
      .from("service_categories")
      .select("requires_photos, code")
      .eq("id", categoryId)
      .single();

    if (category?.requires_photos) {
      if (!beforePhotoUrl) {
        return NextResponse.json(
          { error: "Before photo required for this service type" },
          { status: 400 }
        );
      }
      if (!afterPhotoUrl) {
        return NextResponse.json(
          { error: "After photo required for this service type" },
          { status: 400 }
        );
      }
    }

    // 1. Insert service completion (with photos)
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
        before_photo_url: beforePhotoUrl || null,
        after_photo_url: afterPhotoUrl || null,
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

    // Rule 9, Step 5: Formula logging (create formula_history if formula data provided)
    let formulaHistoryId: string | null = null;
    if (formulaData && clientId && completion?.id) {
      const { data: fh } = await admin
        .from("formula_history")
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          service_completion_id: completion.id,
          formula: formulaData,
          before_photo_url: beforePhotoUrl || null,
          after_photo_url: afterPhotoUrl || null,
          sharing_level: "private",
        })
        .select("id")
        .single();
      formulaHistoryId = fh?.id || null;

      // Auto-capture translation outcome (fire-and-forget)
      if (formulaHistoryId && clientId) {
        admin
          .from("translation_outcomes")
          .insert({
            workspace_id: workspaceId,
            formula_history_id: formulaHistoryId,
            client_id: clientId,
            outcome_success: null,
          })
          .then(() => {})
          .catch(() => {});
      }
    }

    // Rule 9, Step 10: Kernel event (async, non-blocking)
    publishEvent({
      event_type: "service.completed",
      workspace_id: workspaceId,
      timestamp: now,
      payload: {
        completion_id: completion?.id,
        student_id: studentId,
        category_id: categoryId,
        category_code: category?.code || null,
        client_id: clientId || null,
        before_photo_url: beforePhotoUrl || null,
        after_photo_url: afterPhotoUrl || null,
        formula_history_id: formulaHistoryId,
        formula_entry_id: formulaEntryId || null,
      },
    });

    // Fire marketing automations for service completion (non-blocking)
    if (clientId) {
      fireAutomationsForTrigger({
        workspaceId,
        trigger: "service_completed",
        clientId: clientId || "",
        context: {
          clientId: clientId || null,
          categoryCode: category?.code || null,
          studentId,
          studentName: studentName || null,
        },
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({
      success: true,
      completionId: completion?.id,
      formulaHistoryId,
    });
  } catch (err) {
    console.error("Service complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
