import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

const DEFAULT_CATEGORIES = [
  { name: "Haircut", code: "haircut", required_count: 80, sort_order: 1 },
  { name: "Color", code: "color", required_count: 50, sort_order: 2 },
  { name: "Highlight / Foil", code: "highlight", required_count: 40, sort_order: 3 },
  { name: "Perm / Wave", code: "perm", required_count: 25, sort_order: 4 },
  { name: "Chemical Straightening", code: "straightening", required_count: 15, sort_order: 5 },
  { name: "Shampoo & Style", code: "shampoo_style", required_count: 100, sort_order: 6 },
  { name: "Blowout", code: "blowout", required_count: 60, sort_order: 7 },
  { name: "Updo / Formal Style", code: "updo", required_count: 20, sort_order: 8 },
];

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("service_categories")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Categories already seeded" });
    }

    const rows = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      workspace_id: workspaceId,
    }));

    const { error } = await admin.from("service_categories").insert(rows);

    if (error) {
      console.error("Seed categories error:", error);
      return NextResponse.json({ error: "Failed to seed", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length, categories: DEFAULT_CATEGORIES.map((c) => c.name) });
  } catch (err) {
    console.error("Seed categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
