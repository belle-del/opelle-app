import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import { publishEvent } from "@/lib/kernel";
import { analyzeInspoDirect } from "@/lib/ai/inspo-analysis";
import type { ClientUserRow } from "@/lib/types";

// GET — list inspo submissions for the authenticated client
export async function GET() {
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

  const { data: submissions } = await admin
    .from("inspo_submissions")
    .select("*")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (submissions || []).map(async (sub) => {
      const { data: files } = await admin.storage
        .from("client-inspo")
        .list(`${cu.workspace_id}/${cu.client_id}/${sub.id}`);

      const photoUrls = (files || [])
        .filter((f) => !f.name.startsWith("."))
        .map((f) => {
          const { data } = admin.storage
            .from("client-inspo")
            .getPublicUrl(`${cu.workspace_id}/${cu.client_id}/${sub.id}/${f.name}`);
          return data.publicUrl;
        });

      return { ...sub, photoUrls };
    })
  );

  return NextResponse.json(enriched);
}

// POST — upload inspo photos + run Claude AI analysis for deep understanding
export async function POST(request: NextRequest) {
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

  // Parse multipart form data
  const formData = await request.formData();
  const clientNotes = formData.get("clientNotes") as string | null;
  const categoriesJson = formData.get("categories") as string | null;
  const categoryMeta = categoriesJson ? JSON.parse(categoriesJson) as { category: string; photoIndices: number[] }[] : undefined;

  const photoFiles: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo") && value instanceof File) {
      photoFiles.push(value);
    }
  }

  if (photoFiles.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
  }
  if (photoFiles.length > 12) {
    return NextResponse.json({ error: "Maximum 12 photos allowed" }, { status: 400 });
  }

  // 1. Create the inspo_submissions row
  const { data: submission, error: insertError } = await admin
    .from("inspo_submissions")
    .insert({
      workspace_id: cu.workspace_id,
      client_id: cu.client_id,
      client_notes: clientNotes?.trim() || null,
      requires_consult: false,
      reviewed_by_stylist: false,
    })
    .select("*")
    .single();

  if (insertError || !submission) {
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }

  // Fire kernel event
  publishEvent({
    event_type: "inspo_submitted",
    workspace_id: cu.workspace_id,
    timestamp: new Date().toISOString(),
    payload: {
      submission_id: submission.id,
      client_id: cu.client_id,
      photo_count: photoFiles.length,
      has_notes: !!clientNotes,
    },
  });

  // 2. Upload photos to Supabase Storage + collect base64 for Claude
  const imagesForClaude: { mediaType: string; base64: string }[] = [];

  for (let i = 0; i < photoFiles.length; i++) {
    const file = photoFiles[i];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${cu.workspace_id}/${cu.client_id}/${submission.id}/photo_${i}.${ext}`;

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    await admin.storage.from("client-inspo").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    imagesForClaude.push({
      mediaType: file.type,
      base64: buffer.toString("base64"),
    });
  }

  // 3. Gather client context
  const { data: clientRecord } = await admin
    .from("clients")
    .select("preference_profile, first_name, last_name")
    .eq("id", cu.client_id)
    .single();

  const { data: formulaEntries } = await admin
    .from("formula_entries")
    .select("raw_notes, service_date, general_notes")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .order("service_date", { ascending: false })
    .limit(3);

  const preferenceProfile = clientRecord?.preference_profile;
  const formulaHistory = (formulaEntries || [])
    .map((e) => `- ${e.service_date}: ${e.raw_notes}${e.general_notes ? ` (Notes: ${e.general_notes})` : ""}`)
    .join("\n");

  // 4. Run direct Claude vision analysis
  let analysisResult: { questions: Array<{ id: string; question: string; type: string; options?: string[]; photoIndex?: number }>; clientSummary: string } | null = null;
  let analysisError: string | null = null;

  try {
    analysisResult = await analyzeInspoDirect({
      images: imagesForClaude,
      categoryMeta,
      clientNotes: clientNotes?.trim() || null,
      clientContext: preferenceProfile
        ? {
            firstName: clientRecord?.first_name ?? undefined,
            lastName: clientRecord?.last_name ?? undefined,
            colorDirection: preferenceProfile.colorDirection,
            maintenanceLevel: preferenceProfile.maintenanceLevel,
            styleNotes: preferenceProfile.styleNotes,
            processingPreferences: preferenceProfile.processingPreferences,
          }
        : null,
      formulaHistory: formulaHistory || null,
    });
  } catch (err) {
    console.error("Claude inspo analysis failed:", err);
    analysisError = err instanceof Error ? err.message : "Analysis failed";
  }

  // 5. Update submission with analysis
  if (analysisResult) {
    await admin
      .from("inspo_submissions")
      .update({
        ai_analysis: {
          generatedFormQuestions: analysisResult.questions,
          clientSummary: analysisResult.clientSummary,
        },
        client_summary: analysisResult.clientSummary,
      })
      .eq("id", submission.id);

    // Notify client
    await createClientNotification({
      workspaceId: cu.workspace_id,
      clientId: cu.client_id,
      type: "inspo_update",
      title: "Your inspo questions are ready",
      body: analysisResult.clientSummary,
      actionUrl: `/client/inspo/${submission.id}`,
    });
  }

  return NextResponse.json({
    id: submission.id,
    aiAnalysis: analysisResult
      ? {
          generatedFormQuestions: analysisResult.questions,
          clientSummary: analysisResult.clientSummary,
        }
      : null,
    clientSummary: analysisResult?.clientSummary ?? null,
    aiAnalysisFailed: analysisResult === null,
    analysisError,
    success: true,
  });
}
