import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import { publishEvent, analyzeInspo } from "@/lib/kernel";
import type { ClientUserRow, InspoAnalysis } from "@/lib/types";

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

      const photoUrls = (files || []).map((f) => {
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

// POST — upload inspo photos + trigger Claude AI analysis
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
  const photoFiles: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo") && value instanceof File) {
      photoFiles.push(value);
    }
  }

  if (photoFiles.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
  }
  if (photoFiles.length > 5) {
    return NextResponse.json({ error: "Maximum 5 photos allowed" }, { status: 400 });
  }

  // 1. Create the inspo_submissions row first to get an ID
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

  // Fire kernel event for inspo submission
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

  // 2. Upload photos to Supabase Storage
  const inspoPhotosBase64: { mediaType: string; data: string }[] = [];

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

    // Convert to base64 for Claude
    inspoPhotosBase64.push({
      mediaType: file.type,
      data: buffer.toString("base64"),
    });
  }

  // 3. Gather client context for Claude
  const { data: clientRecord } = await admin
    .from("clients")
    .select("preference_profile, first_name, last_name")
    .eq("id", cu.client_id)
    .single();

  // Get last 3 formula entries for context
  const { data: formulaEntries } = await admin
    .from("formula_entries")
    .select("raw_notes, service_date, general_notes")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .order("service_date", { ascending: false })
    .limit(3);

  // Get most recent before/after photos from client's file
  const { data: recentPhotos } = await admin
    .from("photos")
    .select("url, photo_type")
    .eq("client_id", cu.client_id)
    .eq("workspace_id", cu.workspace_id)
    .in("photo_type", ["before", "after"])
    .order("created_at", { ascending: false })
    .limit(4);

  // 4. Call kernel AI for analysis (compliant — all traffic through kernel)
  let aiAnalysis: InspoAnalysis | null = null;

  const preferenceProfile = clientRecord?.preference_profile;
  const formulaHistory = (formulaEntries || [])
    .map((e) => `- ${e.service_date}: ${e.raw_notes}${e.general_notes ? ` (Notes: ${e.general_notes})` : ""}`)
    .join("\n");

  try {
    const result = await analyzeInspo({
      images: inspoPhotosBase64.map((p) => ({
        media_type: p.mediaType,
        data: p.data,
      })),
      clientContext: preferenceProfile ? {
        firstName: clientRecord?.first_name ?? undefined,
        lastName: clientRecord?.last_name ?? undefined,
        colorDirection: preferenceProfile.colorDirection,
        maintenanceLevel: preferenceProfile.maintenanceLevel,
        styleNotes: preferenceProfile.styleNotes,
        processingPreferences: preferenceProfile.processingPreferences,
      } : null,
      clientNotes: clientNotes?.trim() || null,
      formulaHistory: formulaHistory || null,
    });
    if (result?.success && result.analysis) {
      aiAnalysis = result.analysis as InspoAnalysis;
    }
  } catch (err) {
    console.error("Kernel AI analysis failed:", err);
    // Continue without AI analysis — submission is still saved
  }

  // 5. Update the submission with AI analysis results
  if (aiAnalysis) {
    await admin
      .from("inspo_submissions")
      .update({
        ai_analysis: aiAnalysis,
        feasibility: aiAnalysis.feasibility,
        client_summary: aiAnalysis.clientSummary,
        stylist_flag: aiAnalysis.stylistFlag,
        requires_consult: aiAnalysis.requiresConsult,
      })
      .eq("id", submission.id);

    // Fire kernel event for inspo analysis
    publishEvent({
      event_type: "inspo_analyzed",
      workspace_id: cu.workspace_id,
      timestamp: new Date().toISOString(),
      payload: {
        submission_id: submission.id,
        client_id: cu.client_id,
        feasibility: aiAnalysis.feasibility,
        requires_consult: aiAnalysis.requiresConsult,
        demand_signals: aiAnalysis.demandSignals?.map((s) => s.direction) ?? [],
        question_count: aiAnalysis.generatedFormQuestions?.length ?? 0,
      },
    });

    // 6. Store demand signals (Metis pipeline — always store)
    if (aiAnalysis.demandSignals && aiAnalysis.demandSignals.length > 0) {
      await admin.from("inspo_demand_signals").insert(
        aiAnalysis.demandSignals.map((signal) => ({
          workspace_id: cu.workspace_id,
          client_id: cu.client_id,
          inspo_submission_id: submission.id,
          direction: signal.direction,
          product_hint: signal.productHint || null,
          confidence: signal.confidence,
        }))
      );
    }

    // 7. Auto-create task for stylist when requiresConsult is true
    if (aiAnalysis.requiresConsult) {
      const clientName = [clientRecord?.first_name, clientRecord?.last_name]
        .filter(Boolean)
        .join(" ");

      await admin.from("tasks").insert({
        workspace_id: cu.workspace_id,
        client_id: cu.client_id,
        title: `Review inspo flag — ${clientName}`,
        notes: aiAnalysis.stylistFlag,
        status: "pending",
        due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        reminder_enabled: false,
        attachments: [],
      });
    }

    // 8. Send notification to client
    if (aiAnalysis.requiresConsult && aiAnalysis.generatedFormQuestions?.length > 0) {
      await createClientNotification({
        workspaceId: cu.workspace_id,
        clientId: cu.client_id,
        type: "inspo_update",
        title: "Your consult form is ready — tap to fill it out",
        actionUrl: `/client/inspo/${submission.id}`,
      });
    } else {
      await createClientNotification({
        workspaceId: cu.workspace_id,
        clientId: cu.client_id,
        type: "inspo_update",
        title: "Your inspo has been analyzed",
        body: aiAnalysis.clientSummary,
        actionUrl: `/client/inspo/${submission.id}`,
      });
    }
  }

  return NextResponse.json({
    id: submission.id,
    aiAnalysis,
    success: true,
  });
}
