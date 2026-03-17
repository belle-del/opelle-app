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

  console.log("[Mentis] KERNEL_ENABLED:", process.env.KERNEL_ENABLED, "KERNEL_AUTH_KEY set:", !!process.env.KERNEL_AUTH_KEY, "KERNEL_API_URL:", process.env.KERNEL_API_URL);

  const result = await mentisChat({
    message,
    conversationHistory,
    context,
    workspaceContext,
  });

  if (!result) {
    return NextResponse.json({ error: "Mentis unavailable" }, { status: 503 });
  }

  return NextResponse.json(result);
}
