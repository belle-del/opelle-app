import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getMemberRole } from "@/lib/db/team";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const memberInfo = await getMemberRole(user.id, workspaceId);
    if (!memberInfo) {
      // User is not a recognized member — return minimal permissions (not owner!)
      return NextResponse.json({ role: "student", permissions: {} });
    }

    return NextResponse.json({
      role: memberInfo.role,
      permissions: memberInfo.permissions,
    });
  } catch (err) {
    console.error("[team/permissions] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
