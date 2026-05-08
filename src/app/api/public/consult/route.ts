import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import { analyzeInspoDirect } from "@/lib/ai/inspo-analysis";

// Allow up to 60s for Claude vision analysis + photo uploads.
export const maxDuration = 60;

// Origin allowlist for the public consult form on belle.co.beauty.
// Localhost entries permit local dev of the v2 form against the live API.
const ALLOWED_ORIGINS = new Set<string>([
  "https://belle.co.beauty",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const BELLE_OWNER_EMAIL = "belle@dominusfoundry.com";

// Module-scope cache. Once we resolve Belle's workspace once, we reuse it for
// the lifetime of the serverless instance to avoid re-querying on every hit.
let cachedWorkspaceId: string | null = null;

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function isOriginAllowed(origin: string | null): boolean {
  // No-origin requests (curl, server-to-server) are allowed for testing.
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403, headers: corsHeaders(origin) });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

async function resolveBelleWorkspaceId(): Promise<string | null> {
  if (cachedWorkspaceId) return cachedWorkspaceId;

  const admin = createSupabaseAdminClient();

  // Walk through paginated auth users to find Belle by email.
  // listUsers returns up to 1000 per page by default; for a single-tenant
  // Opélle instance this is effectively a single page.
  let page = 1;
  let belleUserId: string | null = null;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    const match = data.users.find(
      (u) => (u.email || "").toLowerCase() === BELLE_OWNER_EMAIL.toLowerCase()
    );
    if (match) {
      belleUserId = match.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!belleUserId) {
    console.error("[public/consult] Could not find Belle's auth user by email");
    return null;
  }

  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", belleUserId)
    .limit(1)
    .maybeSingle();

  if (wsErr || !ws) {
    console.error("[public/consult] Could not find Belle's workspace:", wsErr?.message);
    return null;
  }

  cachedWorkspaceId = ws.id as string;
  return cachedWorkspaceId;
}

function detectIsEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

function buildSubmissionNotes(fields: {
  hairStory: string;
  goals: string;
  budget: string;
  timing: string;
  referrer: string;
}): string {
  const lines: string[] = [];
  if (fields.hairStory) lines.push(`Hair story:\n${fields.hairStory}`);
  if (fields.goals) lines.push(`Goals:\n${fields.goals}`);
  if (fields.budget) lines.push(`Budget: ${fields.budget}`);
  if (fields.timing) lines.push(`Timing: ${fields.timing}`);
  if (fields.referrer) lines.push(`Referred by: ${fields.referrer}`);
  return lines.join("\n\n");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  try {
    // 1. Parse multipart form.
    const formData = await request.formData();
    const name = ((formData.get("name") as string) || "").trim();
    const contact = ((formData.get("contact") as string) || "").trim();
    const hairStory = ((formData.get("hair_story") as string) || "").trim();
    const goals = ((formData.get("goals") as string) || "").trim();
    const budget = ((formData.get("budget") as string) || "").trim();
    const timing = ((formData.get("timing") as string) || "").trim();
    const referrer = ((formData.get("referrer") as string) || "").trim();

    if (!name || !contact) {
      return NextResponse.json(
        { error: "name and contact are required" },
        { status: 400, headers }
      );
    }

    const photoFiles: File[] = [];
    for (let i = 0; i < 12; i++) {
      const value = formData.get(`photo${i}`);
      if (value instanceof File && value.size > 0) {
        photoFiles.push(value);
      }
    }

    // 2. Look up Belle's workspace.
    const workspaceId = await resolveBelleWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace lookup failed" },
        { status: 500, headers }
      );
    }

    const admin = createSupabaseAdminClient();

    // 3. Create the client record.
    const isEmail = detectIsEmail(contact);
    const firstName = name.split(/\s+/)[0] || name;
    const lastName = name.split(/\s+/).slice(1).join(" ") || null;

    const notesParts = ["Public consult from belle.co.beauty"];
    if (referrer) notesParts.push(`Referred by: ${referrer}`);

    const { data: client, error: clientErr } = await admin
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        first_name: firstName,
        last_name: lastName,
        email: isEmail ? contact.toLowerCase() : null,
        phone: isEmail ? null : contact,
        notes: notesParts.join(". "),
        tags: ["public_consult"],
      })
      .select("id, first_name, last_name")
      .single();

    if (clientErr || !client) {
      console.error("[public/consult] Failed to create client:", clientErr?.message);
      return NextResponse.json(
        { error: "failed to create client" },
        { status: 500, headers }
      );
    }

    // 4. Create the inspo submission.
    const submissionNotes = buildSubmissionNotes({
      hairStory,
      goals,
      budget,
      timing,
      referrer,
    });

    const { data: submission, error: submissionErr } = await admin
      .from("inspo_submissions")
      .insert({
        workspace_id: workspaceId,
        client_id: client.id,
        client_notes: submissionNotes || null,
        requires_consult: true,
        reviewed_by_stylist: false,
      })
      .select("id")
      .single();

    if (submissionErr || !submission) {
      console.error("[public/consult] Failed to create submission:", submissionErr?.message);
      return NextResponse.json(
        { error: "failed to create submission" },
        { status: 500, headers }
      );
    }

    // 5. Upload photos. Track per-photo failures so a single bad upload
    // does not nuke the whole submission.
    const imagesForClaude: { mediaType: string; base64: string }[] = [];
    const photoUploadErrors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${workspaceId}/${client.id}/${submission.id}/photo_${i}.${ext}`;
      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const { error: uploadErr } = await admin.storage
          .from("client-inspo")
          .upload(path, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });
        if (uploadErr) {
          photoUploadErrors.push(`photo${i}: ${uploadErr.message}`);
          continue;
        }
        imagesForClaude.push({
          mediaType: file.type || "image/jpeg",
          base64: buffer.toString("base64"),
        });
      } catch (err) {
        photoUploadErrors.push(
          `photo${i}: ${err instanceof Error ? err.message : "upload failed"}`
        );
      }
    }

    // 6. Run AI analysis if we have at least one photo.
    let analysisResult: Awaited<ReturnType<typeof analyzeInspoDirect>> | null = null;
    let aiAnalysisFailed = false;

    if (imagesForClaude.length > 0) {
      try {
        const combinedNotes = [hairStory, goals].filter(Boolean).join("\n\n") || null;
        analysisResult = await analyzeInspoDirect({
          images: imagesForClaude,
          clientNotes: combinedNotes,
          clientContext: {
            firstName,
            lastName: lastName ?? undefined,
          },
          formulaHistory: null,
        });
      } catch (err) {
        console.error("[public/consult] Claude analysis failed:", err);
        aiAnalysisFailed = true;
      }
    }

    // 7. Persist AI result on the submission row.
    if (analysisResult) {
      const aiAnalysisPayload = {
        feasibility: "needs_consult" as const,
        clientSummary: analysisResult.clientSummary,
        stylistFlag: null,
        requiresConsult: true,
        generatedFormQuestions: analysisResult.questions,
        demandSignals: [],
      };

      await admin
        .from("inspo_submissions")
        .update({
          ai_analysis: aiAnalysisPayload,
          client_summary: analysisResult.clientSummary,
          feasibility: "needs_consult",
        })
        .eq("id", submission.id);
    }

    // 8. Notify Belle. We reuse the existing `inspo_update` notification type
    // since `client_notifications.type` is a free-text column and the type
    // already round-trips through the stylist UI.
    const bodySnippet = hairStory ? hairStory.slice(0, 200) : "";
    const notifyBody = [
      `Contact: ${contact}`,
      bodySnippet ? `\n\n${bodySnippet}${hairStory.length > 200 ? "..." : ""}` : "",
    ].join("");

    await createClientNotification({
      workspaceId,
      clientId: client.id,
      type: "inspo_update",
      title: `New consult from ${name}`,
      body: notifyBody,
      actionUrl: `/app/clients/${client.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        submissionId: submission.id,
        perPhotoQuestions: analysisResult?.questions ?? [],
        aiAnalysisFailed,
        photoUploadErrors: photoUploadErrors.length ? photoUploadErrors : undefined,
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error("[public/consult] Crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500, headers }
    );
  }
}
