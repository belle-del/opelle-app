import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listOutcomes, createOutcome } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");

    const outcomes = await listOutcomes(workspaceId, { limit, offset });
    return NextResponse.json({ outcomes });
  } catch (err) {
    console.error("Outcomes list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { formula_history_id, client_id, formula_translation_id, outcome_success, stylist_feedback, adjustment_notes } = await req.json();

    if (!formula_history_id || !client_id) {
      return NextResponse.json({ error: "formula_history_id and client_id required" }, { status: 400 });
    }

    const outcome = await createOutcome({
      workspaceId,
      formulaHistoryId: formula_history_id,
      clientId: client_id,
      formulaTranslationId: formula_translation_id,
      outcomeSuccess: outcome_success,
      stylistFeedback: stylist_feedback,
      adjustmentNotes: adjustment_notes,
    });

    if (!outcome) {
      return NextResponse.json({ error: "Failed to create outcome" }, { status: 500 });
    }

    return NextResponse.json(outcome, { status: 201 });
  } catch (err) {
    console.error("Outcome create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
