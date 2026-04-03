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

    const { data: products, error } = await admin
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    const rows = (products ?? []) as ProductRow[];

    const lowStockItems = rows.filter(
      (p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold
    );
    const outOfStockItems = rows.filter((p) => p.quantity <= 0);

    const totalValueCents = rows.reduce((sum, p) => {
      const costCents = p.cost_cents ?? (p.unit_cost ? Math.round(Number(p.unit_cost) * 100) : 0);
      return sum + costCents * p.quantity;
    }, 0);

    const categoryBreakdown: Record<string, { count: number; value: number }> = {};
    for (const p of rows) {
      const cat = p.category || "other";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, value: 0 };
      categoryBreakdown[cat].count += 1;
      const costCents = p.cost_cents ?? (p.unit_cost ? Math.round(Number(p.unit_cost) * 100) : 0);
      categoryBreakdown[cat].value += costCents * p.quantity;
    }

    const activeAlerts = await listActiveAlerts(workspaceId);

    return NextResponse.json({
      summary: {
        total_products: rows.length,
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockItems.length,
        total_value_cents: totalValueCents,
      },
      alerts: activeAlerts,
      categories: categoryBreakdown,
      products: rows.map((p) => ({ id: p.id, brand: p.brand, shade: p.shade })),
    });
  } catch (err) {
    console.error("Inventory dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
