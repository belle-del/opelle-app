import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("service_categories")
      .select("id, name, code, required_count, sort_order")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ categories: data || [] });
  } catch (err) {
    console.error("Categories route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
