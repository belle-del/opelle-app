import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClientNotification } from "@/lib/client-notifications";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { emitCommsEvent } from "@/lib/comms-events";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH — mark inspo submission as reviewed by stylist
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const reviewed = body.reviewed === true;

  const supabase = await createSupabaseServerClient();
  const { data: submission, error } = await supabase
    .from("inspo_submissions")
    .update({ reviewed_by_stylist: reviewed })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("client_id")
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Notify client that their inspo was reviewed
  if (reviewed) {
    await createClientNotification({
      workspaceId: workspace.id,
      clientId: submission.client_id,
      type: "inspo_update",
      title: "Your stylist has reviewed your inspo photos",
    });

    emitCommsEvent({
      event: "inspo.reviewed",
      workspaceId: workspace.id,
      clientId: submission.client_id,
      context: { title: "Your stylist reviewed your inspiration photos", action_url: "/client/inspo" },
    });
  }

  return NextResponse.json({ success: true });
}
