import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThread, getMessagesForThread, markThreadRead } from "@/lib/db/messaging";

async function getClientUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return clientUser;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const thread = await getThread(threadId);
    if (!thread || thread.clientId !== clientUser.client_id) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const messages = await getMessagesForThread(threadId);

    // Mark thread as read for client
    await markThreadRead(threadId, "client");

    return NextResponse.json({ thread, messages });
  } catch (error) {
    console.error("Failed to get thread:", error);
    return NextResponse.json(
      { error: "Failed to get thread" },
      { status: 500 }
    );
  }
}
