import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listBadges, seedDefaultBadges } from "@/lib/db/badges";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    await seedDefaultBadges(workspaceId);

    const badges = await listBadges(workspaceId);
    return NextResponse.json({ badges });
  } catch (err) {
    console.error("List badges error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
