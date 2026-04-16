import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getMyTasks } from "@/lib/db/service-tasks";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const tasks = await getMyTasks(user.id, workspaceId);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("My tasks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
