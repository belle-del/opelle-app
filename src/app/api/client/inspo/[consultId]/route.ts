import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import type { ClientUserRow, InspoAnalysis } from "@/lib/types";

interface RouteContext {
  params: Promise<{ consultId: string }>;
}

// GET — get consult form questions for a submission
export async function GET(_request: NextRequest, context: RouteContext) {
  const { consultId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const { data: clientUser } = await admin
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientUser) return NextResponse.json({ error: "No client record" }, { status: 403 });
  const cu = clientUser as ClientUserRow;

  // Get the submission
  const { data: submission } = await admin
    .from("inspo_submissions")
    .select("*")
    .eq("id", consultId)
    .eq("client_id", cu.client_id)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const aiAnalysis = submission.ai_analysis as InspoAnalysis | null;
  const { data: files } = await admin.storage
    .from("client-inspo")
    .list(`${cu.workspace_id}/${cu.client_id}/${submission.id}`);

  const photoUrls = (files || []).map((f) => {
    const { data } = admin.storage
      .from("client-inspo")
      .getPublicUrl(`${cu.workspace_id}/${cu.client_id}/${submission.id}/${f.name}`);
    return data.publicUrl;
  });

  // Check if consult form was already submitted
  const { data: existingResponse } = await admin
    .from("intake_responses")
    .select("id, answers, created_at")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .filter("answers->>inspo_submission_id", "eq", consultId)
    .single();

  return NextResponse.json({
    id: submission.id,
    clientNotes: submission.client_notes,
    clientSummary: aiAnalysis?.clientSummary || null,
    feasibility: aiAnalysis?.feasibility || null,
    requiresConsult: submission.requires_consult,
    questions: aiAnalysis?.generatedFormQuestions || [],
    photoUrls,
    submittedAnswers: existingResponse?.answers || null,
    submittedAt: existingResponse?.created_at || null,
    createdAt: submission.created_at,
  });
}

// POST — submit consult form answers
export async function POST(request: NextRequest, context: RouteContext) {
  const { consultId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const { data: clientUser } = await admin
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientUser) return NextResponse.json({ error: "No client record" }, { status: 403 });
  const cu = clientUser as ClientUserRow;

  // Verify submission belongs to client
  const { data: submission } = await admin
    .from("inspo_submissions")
    .select("id, workspace_id")
    .eq("id", consultId)
    .eq("client_id", cu.client_id)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const body = await request.json();
  const { answers } = body;

  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Answers are required" }, { status: 400 });
  }

  // Save as intake_responses row
  const { error: insertError } = await admin
    .from("intake_responses")
    .insert({
      workspace_id: cu.workspace_id,
      client_id: cu.client_id,
      answers: {
        ...answers,
        inspo_submission_id: consultId,
      },
    });

  if (insertError) {
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }

  // Notify stylist via notification (they'll see it in their inspo tab)
  // Also create a client notification confirming submission
  await createClientNotification({
    workspaceId: cu.workspace_id,
    clientId: cu.client_id,
    type: "inspo_update",
    title: "Sent to your stylist \u2014 they'll be in touch soon",
  });

  return NextResponse.json({ success: true });
}
