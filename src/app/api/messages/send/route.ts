import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrCreateThread, createMessage } from "@/lib/db/messaging";
import { dispatchComms } from "@/lib/kernel";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    let workspaceId: string | undefined;

    // Try owner first
    const { data: ownedWs } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWs) {
      workspaceId = ownedWs.id;
    } else {
      // Fallback: check workspace_members
      const { data: membership } = await admin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      workspaceId = membership?.workspace_id;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const workspace = { id: workspaceId };

    const body = await request.json();
    const { clientId, body: messageBody, templateId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    if (!messageBody && !templateId) {
      return NextResponse.json(
        { error: "body or templateId is required" },
        { status: 400 }
      );
    }

    // Get or create thread for this workspace + client
    const thread = await getOrCreateThread(workspace.id, clientId);

    // Create the message
    const message = await createMessage({
      workspaceId: workspace.id,
      threadId: thread.id,
      senderType: "stylist",
      senderId: user.id,
      body: messageBody || "",
    });

    // Resolve client name for activity log
    const { data: client } = await admin
      .from("clients")
      .select("first_name, last_name")
      .eq("id", clientId)
      .single();
    const clientName = client
      ? `${client.first_name} ${client.last_name}`.trim()
      : "Unknown client";

    // Log to activity history
    logActivity(
      "message.sent",
      "message",
      thread.id,
      clientName,
      { after: { preview: (messageBody || "").substring(0, 80) } }
    ).catch(() => {});

    // Dispatch via kernel (fire and forget)
    dispatchComms({
      event: "message.sent",
      workspace_id: workspace.id,
      client_id: clientId,
      context: { title: (messageBody || "").substring(0, 80) },
      template_id: templateId,
      body: messageBody,
    }).catch((err) => console.error("Comms dispatch failed:", err));

    return NextResponse.json({ thread, message });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
