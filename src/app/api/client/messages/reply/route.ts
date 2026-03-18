import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getThread, createMessage } from "@/lib/db/messaging";
import { publishEvent } from "@/lib/kernel";

async function getClientUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  const { data: clientUser } = await admin
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return clientUser;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, body: messageBody } = body;

    if (!threadId || !messageBody) {
      return NextResponse.json(
        { error: "threadId and body are required" },
        { status: 400 }
      );
    }

    // Verify thread belongs to this client
    const thread = await getThread(threadId);
    if (!thread || thread.clientId !== clientUser.client_id) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create message
    const message = await createMessage({
      workspaceId: thread.workspaceId,
      threadId,
      senderType: "client",
      senderId: clientUser.client_id,
      body: messageBody,
    });

    // Emit event via kernel (fire and forget)
    publishEvent({
      event_type: "client.message_received",
      workspace_id: thread.workspaceId,
      timestamp: new Date().toISOString(),
      payload: {
        clientId: clientUser.client_id,
        threadId,
      },
    }).catch((err) => console.error("Event publish failed:", err));

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Failed to send reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
