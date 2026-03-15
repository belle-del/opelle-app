import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThread, markThreadRead } from "@/lib/db/messaging";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const thread = await getThread(threadId);
    if (!thread || thread.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    await markThreadRead(threadId, "stylist");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark thread read:", error);
    return NextResponse.json(
      { error: "Failed to mark thread read" },
      { status: 500 }
    );
  }
}
