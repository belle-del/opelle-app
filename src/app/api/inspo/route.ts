import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/db/workspaces";

// GET — list inspo submissions for a workspace (stylist side)
// Optional ?clientId= to filter by client
// Optional ?unreviewedOnly=true to only get unreviewed submissions
export async function GET(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const unreviewedOnly = searchParams.get("unreviewedOnly") === "true";

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("inspo_submissions")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  if (unreviewedOnly) {
    query = query.eq("reviewed_by_stylist", false).eq("requires_consult", true);
  }

  const { data: submissions } = await query;

  // Enrich with photo URLs and consult answers
  const enriched = await Promise.all(
    (submissions || []).map(async (sub) => {
      // Get photos
      const { data: files } = await admin.storage
        .from("client-inspo")
        .list(`${workspace.id}/${sub.client_id}/${sub.id}`);

      const photoUrls = (files || []).map((f) => {
        const { data } = admin.storage
          .from("client-inspo")
          .getPublicUrl(`${workspace.id}/${sub.client_id}/${sub.id}/${f.name}`);
        return data.publicUrl;
      });

      // Check for consult form answers
      const { data: intakeResponse } = await admin
        .from("intake_responses")
        .select("answers")
        .eq("client_id", sub.client_id)
        .eq("workspace_id", workspace.id)
        .filter("answers->>inspo_submission_id", "eq", sub.id)
        .single();

      return {
        ...sub,
        photoUrls,
        consultAnswers: intakeResponse?.answers || null,
      };
    })
  );

  return NextResponse.json(enriched);
}
