import { NextRequest, NextResponse } from "next/server";
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
      .from("workspaces")
      .select("theme")
      .eq("id", workspaceId)
      .single();

    return NextResponse.json({ theme: data?.theme ?? null });
  } catch (err) {
    console.error("Get theme error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (ws?.owner_id !== user.id) {
      return NextResponse.json({ error: "Only workspace owner can update theme" }, { status: 403 });
    }

    const theme = await req.json();

    const { error } = await admin
      .from("workspaces")
      .update({ theme })
      .eq("id", workspaceId);

    if (error) {
      return NextResponse.json({ error: "Failed to update theme" }, { status: 500 });
    }

    return NextResponse.json({ success: true, theme });
  } catch (err) {
    console.error("Update theme error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
