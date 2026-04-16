import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { metisChat } from "@/lib/kernel";
import type { CheatSheet } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    // Gather all client data in parallel
    const [clientResult, appointmentsResult, formulasResult, inspoResult] = await Promise.all([
      admin.from("clients")
        .select("first_name, last_name, notes, tags, preference_profile")
        .eq("id", clientId)
        .eq("workspace_id", workspaceId)
        .single(),
      admin.from("appointments")
        .select("service_name, start_at, status, notes")
        .eq("client_id", clientId)
        .eq("workspace_id", workspaceId)
        .order("start_at", { ascending: false })
        .limit(5),
      admin.from("formula_entries")
        .select("raw_notes, general_notes, service_date, parsed_formula")
        .eq("client_id", clientId)
        .eq("workspace_id", workspaceId)
        .order("service_date", { ascending: false })
        .limit(5),
      admin.from("inspo_submissions")
        .select("client_notes, ai_analysis, stylist_flag, created_at")
        .eq("client_id", clientId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const client = clientResult.data;
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const appointments = appointmentsResult.data || [];
    const formulas = formulasResult.data || [];
    const inspo = inspoResult.data || [];

    // Build raw cheat sheet (works without AI)
    const lastVisit = appointments[0]
      ? { date: appointments[0].start_at, service: appointments[0].service_name }
      : undefined;

    const profile = client.preference_profile as Record<string, string> | null;
    const rawCheatSheet: CheatSheet = {
      lastVisit,
      serviceSnapshot: profile ? {
        pattern: profile.colorDirection,
        preferences: profile.processingPreferences,
        treatments: profile.maintenanceLevel,
        goals: profile.nextVisitSuggestion,
      } : undefined,
      personalizationCues: [
        ...(client.tags || []),
        ...(inspo.filter((i: Record<string, unknown>) => i.stylist_flag).map((i: Record<string, unknown>) => `Inspo flag: ${i.stylist_flag}`)),
      ],
      recommendations: { products: [], services: [] },
      rebooking: undefined,
    };

    // Try to get Metis-enhanced cheat sheet (async, graceful degradation)
    const clientName = `${client.first_name} ${client.last_name || ""}`.trim();
    const aiResult = await metisChat({
      message: `Generate a concise service cheat sheet for client "${clientName}". Include: key preferences, last visit notes, formula highlights, things to remember, and suggested approach for today.`,
      conversationHistory: [],
      context: { page: "cheat_sheet", clientId, clientName },
      workspaceContext: {
        client_notes: client.notes,
        client_tags: client.tags,
        preference_profile: client.preference_profile,
        recent_appointments: appointments.slice(0, 3),
        recent_formulas: formulas.slice(0, 3).map((f: Record<string, unknown>) => ({
          date: f.service_date,
          notes: f.raw_notes,
          general: f.general_notes,
        })),
        recent_inspo: inspo.slice(0, 2).map((i: Record<string, unknown>) => ({
          notes: i.client_notes,
          flag: i.stylist_flag,
        })),
      },
    });

    return NextResponse.json({
      cheatSheet: rawCheatSheet,
      aiSummary: aiResult?.reply || null,
      clientName,
    });
  } catch (err) {
    console.error("Cheat sheet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
