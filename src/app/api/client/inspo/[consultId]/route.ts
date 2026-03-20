import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import { generateStylistIntelligence, generateAppointmentFlag } from "@/lib/ai/inspo-analysis";
import type { ClientUserRow, InspoAnalysis } from "@/lib/types";

// Allow up to 60s for Claude intelligence generation
export const maxDuration = 60;

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
    .select("id, workspace_id, ai_analysis, client_notes")
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

  // Get the submission's AI analysis to pair questions with answers
  const aiAnalysis = (submission as unknown as { ai_analysis?: InspoAnalysis }).ai_analysis;
  const questions = aiAnalysis?.generatedFormQuestions || [];

  // Get client context for the intelligence summary
  const { data: clientRecord } = await admin
    .from("clients")
    .select("first_name, last_name, preference_profile")
    .eq("id", cu.client_id)
    .single();

  const { data: formulaEntries } = await admin
    .from("formula_entries")
    .select("raw_notes, service_date, general_notes")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .order("service_date", { ascending: false })
    .limit(3);

  const formulaHistory = (formulaEntries || [])
    .map((e) => `- ${e.service_date}: ${e.raw_notes}${e.general_notes ? ` (Notes: ${e.general_notes})` : ""}`)
    .join("\n");

  // Generate stylist intelligence summary using AI
  try {
    const intelligence = await generateStylistIntelligence({
      questions,
      answers,
      clientSummary: aiAnalysis?.clientSummary || null,
      clientNotes: (submission as unknown as { client_notes?: string }).client_notes || null,
      clientContext: clientRecord?.preference_profile
        ? {
            firstName: clientRecord?.first_name ?? undefined,
            colorDirection: clientRecord.preference_profile.colorDirection,
            maintenanceLevel: clientRecord.preference_profile.maintenanceLevel,
            styleNotes: clientRecord.preference_profile.styleNotes,
          }
        : null,
      formulaHistory: formulaHistory || null,
    });

    // Check if next appointment time might not align with what was learned
    let appointmentFlag: { severity: "warning" | "critical"; message: string; nextAppointment: { serviceName: string; durationMins: number; startAt: string } } | null = null;

    try {
      // Get next upcoming appointment for this client
      const { data: nextAppts } = await admin
        .from("appointments")
        .select("*")
        .eq("client_id", cu.client_id)
        .eq("workspace_id", cu.workspace_id)
        .in("status", ["scheduled", "pending_confirmation"])
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(1);

      const nextAppt = nextAppts?.[0];
      if (nextAppt) {
        // Use AI to check if appointment time aligns with the inspo
        appointmentFlag = await generateAppointmentFlag({
          intelligenceSummary: intelligence.whatWasLearned,
          appointmentPrep: intelligence.appointmentPrep,
          potentialChallenges: intelligence.potentialChallenges,
          nextAppointment: {
            serviceName: nextAppt.service_name,
            durationMins: nextAppt.duration_mins,
            startAt: nextAppt.start_at,
          },
        });
      }
    } catch (err) {
      console.error("Appointment flag check failed:", err);
      // Non-critical
    }

    // Save intelligence + flag to the submission
    await admin
      .from("inspo_submissions")
      .update({
        ai_analysis: {
          ...aiAnalysis,
          stylistIntelligence: intelligence,
          ...(appointmentFlag ? { appointmentFlag } : {}),
        },
      })
      .eq("id", consultId);
  } catch (err) {
    console.error("Stylist intelligence generation failed:", err);
    // Non-critical — answers are already saved
  }

  // Notify client
  await createClientNotification({
    workspaceId: cu.workspace_id,
    clientId: cu.client_id,
    type: "inspo_update",
    title: "Sent to your stylist — they'll be in touch soon",
  });

  return NextResponse.json({ success: true });
}
