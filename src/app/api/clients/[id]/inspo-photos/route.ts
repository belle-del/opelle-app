import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = (await params).id;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    // Get inspo submissions with their photos
    const { data: submissions } = await admin
      .from("inspo_submissions")
      .select("id, client_notes, ai_analysis, stylist_flag, feasibility, created_at")
      .eq("client_id", clientId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get inspo-type photos for this client
    const { data: photos } = await admin
      .from("photos")
      .select("id, url, caption, photo_type, created_at")
      .eq("client_id", clientId)
      .eq("workspace_id", workspaceId)
      .in("photo_type", ["inspo", "other"])
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      submissions: submissions || [],
      photos: photos || [],
    });
  } catch (err) {
    console.error("Inspo photos error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
