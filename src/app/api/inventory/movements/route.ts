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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const movementType = searchParams.get("movement_type") ?? undefined;
    const startDate = searchParams.get("start_date") ?? undefined;
    const endDate = searchParams.get("end_date") ?? undefined;

    const movements = await listMovements({ workspaceId, productId, movementType, startDate, endDate, limit });
    return NextResponse.json({ movements });
  } catch (err) {
    console.error("List movements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
