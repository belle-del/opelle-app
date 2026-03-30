import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { acknowledgeAlert } from "@/lib/db/inventory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const ok = await acknowledgeAlert(id, user.id);
    if (!ok) return NextResponse.json({ error: "Alert not found or already acknowledged" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Acknowledge alert error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
