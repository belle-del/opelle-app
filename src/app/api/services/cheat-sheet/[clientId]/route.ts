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

    // Gather all client data in parallel — only query columns that exist
    const [clientResult, appointmentsResult, formulasResult, inspoResult] = await Promise.all([
      admin.from("clients")
        .select("first_name, last_name, pronouns, notes, tags, phone, email")
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
        .limit(3)
        .then(r => r) // graceful if table has no rows
        .catch(() => ({ data: [], error: null })),
    ]);

    const client = clientResult.data;
    if (!client) {
      console.error("Cheat sheet: client not found", clientId, workspaceId, clientResult.error);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const appointments = appointmentsResult.data || [];
    const formulas = formulasResult.data || [];
    const inspo = (inspoResult as { data: Record<string, unknown>[] | null }).data || [];

    // Debug: log what data we found
    console.log("CHEAT-SHEET-DEBUG:", {
      clientId,
      clientNotes: client.notes,
      clientTags: client.tags,
      clientPronouns: client.pronouns,
      appointmentCount: appointments.length,
      formulaCount: formulas.length,
      inspoCount: inspo.length,
      formulaRawNotes: formulas.map((f: Record<string, unknown>) => f.raw_notes),
      appointmentErrors: appointmentsResult.error,
      formulaErrors: formulasResult.error,
    });

    // Build raw cheat sheet from actual data — works without AI
    const completedAppts = appointments.filter((a: Record<string, unknown>) => a.status === "completed" || a.status === "scheduled");
    const lastCompleted = completedAppts.find((a: Record<string, unknown>) => a.status === "completed");
    const lastVisit = lastCompleted
      ? { date: lastCompleted.start_at as string, service: lastCompleted.service_name as string }
      : undefined;

    // Build service snapshot from actual notes and formula data
    const clientNotes = client.notes as string | null;
    const formulaNotes = formulas.map((f: Record<string, unknown>) => f.raw_notes as string).filter(Boolean);

    const rawCheatSheet: CheatSheet = {
      lastVisit,
      serviceSnapshot: {
        pattern: clientNotes || undefined,
        preferences: client.pronouns ? `Pronouns: ${client.pronouns}` : undefined,
        treatments: formulaNotes.length > 0 ? formulaNotes[0] : undefined,
        goals: undefined,
      },
      personalizationCues: [
        ...(client.tags as string[] || []),
        ...(inspo.filter((i: Record<string, unknown>) => i.stylist_flag).map((i: Record<string, unknown>) => `Inspo: ${i.stylist_flag}`)),
      ],
      recommendations: { products: [], services: [] },
      rebooking: undefined,
    };

    // Formula history for display
    const formulaHistory = formulas.map((f: Record<string, unknown>) => ({
      date: f.service_date as string,
      notes: f.raw_notes as string,
      general: f.general_notes as string | null,
    }));

    // Appointment history for display
    const appointmentHistory = appointments.map((a: Record<string, unknown>) => ({
      service: a.service_name as string,
      date: a.start_at as string,
      status: a.status as string,
      notes: a.notes as string | null,
    }));

    // Try to get Metis-enhanced briefing (fire-and-forget, graceful degradation)
    const clientName = `${client.first_name} ${client.last_name || ""}`.trim();
    const aiResult = await metisChat({
      message: `Generate a concise service cheat sheet for client "${clientName}". Include: key preferences, last visit notes, formula highlights, things to remember, and suggested approach for today. Be specific — use the actual data provided.`,
      conversationHistory: [],
      context: { page: "cheat_sheet", clientId, clientName },
      workspaceContext: {
        client_notes: clientNotes,
        client_pronouns: client.pronouns,
        client_tags: client.tags,
        recent_appointments: appointmentHistory.slice(0, 3),
        recent_formulas: formulaHistory.slice(0, 3),
      },
    });

    return NextResponse.json({
      cheatSheet: rawCheatSheet,
      aiSummary: aiResult?.reply || null,
      clientName,
      formulaHistory,
      appointmentHistory,
    });
  } catch (err) {
    console.error("Cheat sheet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
