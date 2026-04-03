import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getDataQuality } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quality = await getDataQuality(workspaceId);
    return NextResponse.json(quality);
  } catch (err) {
    console.error("Data quality error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
