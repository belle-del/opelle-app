import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession } from "@/lib/db/service-sessions";
import { publishEvent } from "@/lib/kernel";
import type { PostServiceFeedback, PostServiceFeedbackRow } from "@/lib/types";
import { postServiceFeedbackRowToModel } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const session = await getSession(sessionId, workspaceId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const body = await req.json();
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("post_service_feedback")
      .insert({
        workspace_id: workspaceId,
        session_id: sessionId,
        service_completion_id: body.serviceCompletionId || null,
        formula_achieved_expected: body.formulaAchievedExpected ?? null,
        adjustment_notes: body.adjustmentNotes || null,
        client_satisfaction: body.clientSatisfaction ?? null,
        any_reactions: body.anyReactions || false,
        reaction_notes: body.reactionNotes || null,
        actual_processing_time: body.actualProcessingTime ?? null,
        processing_notes: body.processingNotes || null,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Failed to save feedback:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    const feedback: PostServiceFeedback = postServiceFeedbackRowToModel(data as PostServiceFeedbackRow);

    publishEvent({
      event_type: "service.feedback_submitted",
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      payload: {
        session_id: sessionId,
        client_id: session.clientId,
        satisfaction: body.clientSatisfaction,
        formula_accurate: body.formulaAchievedExpected,
      },
    }).catch(() => {});

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
