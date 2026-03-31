import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const admin = createSupabaseAdminClient();

    // Fetch the formula entry to get client_id and service_date
    const { data: entry, error: entryError } = await admin
      .from("formula_entries")
      .select("id, client_id, service_date")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(null);
    }

    // Find closest formula_history record with photos within ±1 day
    const serviceDate = new Date(entry.service_date);
    const dayBefore = new Date(serviceDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(serviceDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { data: historyRows } = await admin
      .from("formula_history")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        result_notes,
        client_satisfaction,
        created_at,
        service_completion_id
      `)
      .eq("workspace_id", workspaceId)
      .eq("client_id", entry.client_id)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .gte("created_at", dayBefore.toISOString())
      .lte("created_at", dayAfter.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!historyRows || historyRows.length === 0) {
      return NextResponse.json(null);
    }

    type HistoryRow = {
      id: string;
      before_photo_url: string | null;
      after_photo_url: string | null;
      result_notes: string | null;
      client_satisfaction: number | null;
      created_at: string;
      service_completion_id: string | null;
    };

    // Pick closest to service_date
    const best = (historyRows as HistoryRow[]).reduce((closest, row) => {
      const closestDiff = Math.abs(new Date(closest.created_at).getTime() - serviceDate.getTime());
      const rowDiff = Math.abs(new Date(row.created_at).getTime() - serviceDate.getTime());
      return rowDiff < closestDiff ? row : closest;
    });

    return NextResponse.json({
      beforePhotoUrl: best.before_photo_url,
      afterPhotoUrl: best.after_photo_url,
      resultNotes: best.result_notes,
      clientSatisfaction: best.client_satisfaction,
      completedAt: best.created_at,
    });
  } catch (err) {
    console.error("[formula-entries/photos] unexpected error:", err);
    return NextResponse.json(null);
  }
}
