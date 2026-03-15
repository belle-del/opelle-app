import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateThread, createMessage } from "@/lib/db/messaging";
import { dispatchComms } from "@/lib/kernel";

export async function POST(request: Request) {
  try {
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
