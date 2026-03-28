import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThread, getMessagesForThread, markThreadRead } from "@/lib/db/messaging";

export async function GET(
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
      return NextResponse.json({ thread: null, messages: [] });
    }

    const thread = await getThread(threadId);
    if (!thread || thread.workspaceId !== workspace.id) {
      return NextResponse.json({ thread: null, messages: [] });
    }

    const messages = await getMessagesForThread(threadId);

    // Mark thread as read for stylist
    await markThreadRead(threadId, "stylist");

    return NextResponse.json({ thread, messages });
  } catch (error) {
    console.error("Failed to get thread:", error);
    return NextResponse.json(
      { error: "Failed to get thread" },
      { status: 500 }
    );
  }
}
