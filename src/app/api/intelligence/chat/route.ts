import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mentisChat } from "@/lib/kernel";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const { message, conversationHistory = [], context = {} } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Gather workspace context for Mentis
  const [clientCount, productCount, recentAppts] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("appointments").select("id, start_at, services(name), clients(first_name, last_name)")
      .eq("workspace_id", workspace.id)
      .order("start_at", { ascending: false })
      .limit(10),
  ]);

  const workspaceContext = {
    totalClients: clientCount.count ?? 0,
    totalProducts: productCount.count ?? 0,
    recentAppointments: (recentAppts.data || []).map((a: Record<string, unknown>) => ({
      serviceName: (a.services as Record<string, unknown>)?.name as string || "Unknown",
      clientName: `${(a.clients as Record<string, unknown>)?.first_name || ""} ${(a.clients as Record<string, unknown>)?.last_name || ""}`.trim(),
      date: a.start_at as string,
    })),
  };

  // --- Client name detection & data lookup ---
  const { data: allClients } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("workspace_id", workspace.id);

  const messageLower = message.toLowerCase();
  const matchedClient = (allClients || []).find((c: Record<string, unknown>) => {
    const first = ((c.first_name as string) || "").toLowerCase();
    const last = ((c.last_name as string) || "").toLowerCase();
    const full = `${first} ${last}`.trim();
    return (first.length > 2 && messageLower.includes(first)) ||
           (last.length > 2 && messageLower.includes(last)) ||
           (full.length > 4 && messageLower.includes(full));
  });

  let clientContext: Record<string, unknown> | null = null;
  if (matchedClient) {
    const clientId = (matchedClient as Record<string, unknown>).id as string;

    const [clientDetail, formulas, appointments, notes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("formula_entries")
        .select("id, service_date, raw_notes, general_notes, service_types(name)")
        .eq("client_id", clientId)
        .order("service_date", { ascending: false })
        .limit(10),
      supabase.from("appointments")
        .select("id, start_at, status, services(name)")
        .eq("client_id", clientId)
        .order("start_at", { ascending: false })
        .limit(10),
      supabase.from("client_notes")
        .select("id, note, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    clientContext = {
      clientName: `${(clientDetail.data as Record<string, unknown>)?.first_name || ""} ${(clientDetail.data as Record<string, unknown>)?.last_name || ""}`.trim(),
      clientId,
      tags: (clientDetail.data as Record<string, unknown>)?.tags || [],
      colorDirection: (clientDetail.data as Record<string, unknown>)?.color_direction,
      maintenanceLevel: (clientDetail.data as Record<string, unknown>)?.maintenance_level,
      processingPreferences: (clientDetail.data as Record<string, unknown>)?.processing_preferences,
      styleNotes: (clientDetail.data as Record<string, unknown>)?.style_notes,
      lastVisitAt: (clientDetail.data as Record<string, unknown>)?.last_visit_at,
      formulaHistory: (formulas.data || []).map((f: Record<string, unknown>) => ({
        date: f.service_date,
        service: (f.service_types as Record<string, unknown>)?.name || "Unknown",
        rawNotes: f.raw_notes,
        generalNotes: f.general_notes,
      })),
      appointmentHistory: (appointments.data || []).map((a: Record<string, unknown>) => ({
        date: a.start_at,
        status: a.status,
        service: (a.services as Record<string, unknown>)?.name || "Unknown",
      })),
      notes: (notes.data || []).map((n: Record<string, unknown>) => ({
        note: n.note,
        date: n.created_at,
      })),
    };
  }

  const debugInfo = {
    KERNEL_ENABLED: process.env.KERNEL_ENABLED,
    KERNEL_AUTH_KEY_set: !!process.env.KERNEL_AUTH_KEY,
    KERNEL_API_KEY_set: !!process.env.KERNEL_API_KEY,
    KERNEL_API_URL: process.env.KERNEL_API_URL,
  };
  console.log("[Mentis] env debug:", JSON.stringify(debugInfo));

  const result = await mentisChat({
    message,
    conversationHistory,
    context,
    workspaceContext: {
      ...workspaceContext,
      ...(clientContext ? { matchedClient: clientContext } : {}),
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Mentis unavailable", debug: debugInfo }, { status: 503 });
  }

  return NextResponse.json(result);
}
