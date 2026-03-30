import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listActiveAlerts } from "@/lib/db/inventory";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const alerts = await listActiveAlerts();
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("List alerts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
