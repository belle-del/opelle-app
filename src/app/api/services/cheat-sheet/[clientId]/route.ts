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
        .limit(3),
    ]);

    const client = clientResult.data;
    if (!client) {
      console.error("Cheat sheet: client not found", clientId, workspaceId, clientResult.error);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const appointments = appointmentsResult.data || [];
    const formulas = formulasResult.data || [];
    const inspo = inspoResult.data || [];

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

    // Get inspo photo URLs for display
    const inspoPhotoUrls: string[] = [];
    if (inspo.length > 0) {
      const inspoIds = inspo.map((i: Record<string, unknown>) => i.id as string).filter(Boolean);
      if (inspoIds.length > 0) {
        const { data: inspoPhotos } = await admin
          .from("photos")
          .select("url")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId)
          .in("photo_type", ["inspo", "other"])
          .order("created_at", { ascending: false })
          .limit(6);
        if (inspoPhotos) {
          inspoPhotoUrls.push(...inspoPhotos.map((p: { url: string }) => p.url));
        }
      }
    }

    // Build a data-rich prompt so the AI actually uses the info
    const dataBlock = [
      `Client: ${clientName}`,
      client.pronouns ? `Pronouns: ${client.pronouns}` : null,
      clientNotes ? `Notes: ${clientNotes}` : null,
      (client.tags as string[])?.length ? `Tags: ${(client.tags as string[]).join(", ")}` : null,
      formulaHistory.length > 0 ? `Last formula (${formulaHistory[0].date}): ${formulaHistory[0].notes}` : null,
      formulaHistory[0]?.general ? `General notes: ${formulaHistory[0].general}` : null,
      appointmentHistory.length > 0 ? `Last appointment: ${appointmentHistory[0].service} on ${appointmentHistory[0].date}` : null,
    ].filter(Boolean).join("\n");

    const aiResult = await metisChat({
      message: `Here is the client data. Write a 2-3 sentence service briefing summarizing what the stylist needs to know before starting today's service. Be specific and reference the actual data — do NOT ask for more information. Also suggest 1-3 processing steps with durations (e.g. "Lightener: 30 min, Toner: 20 min").\n\n${dataBlock}`,
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

    // Filter out unhelpful AI responses that don't actually use the data
    const aiSummary = aiResult?.reply && !aiResult.reply.includes("I don't have access") && !aiResult.reply.includes("I'd need")
      ? aiResult.reply
      : null;

    return NextResponse.json({
      cheatSheet: rawCheatSheet,
      aiSummary,
      clientName,
      formulaHistory,
      appointmentHistory,
      inspoPhotoUrls,
    });
  } catch (err) {
    console.error("Cheat sheet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
