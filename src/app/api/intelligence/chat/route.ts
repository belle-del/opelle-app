import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mentisChat } from "@/lib/kernel";

export async function POST(req: NextRequest) {
  // Auth check with user-scoped client
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use admin client for data lookups (bypasses RLS)
  const admin = createSupabaseAdminClient();

  const { data: workspace } = await admin
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

  // Gather workspace context for Mentis (admin client bypasses RLS)
  const [clientCount, productCount, recentAppts] = await Promise.all([
    admin.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    admin.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    admin.from("appointments").select("id, start_at, services(name), clients(first_name, last_name)")
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
  const { data: allClients } = await admin
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

    const [clientDetail, formulas, appointments] = await Promise.all([
      admin.from("clients").select("*").eq("id", clientId).single(),
      admin.from("formula_entries")
        .select("id, service_date, raw_notes, general_notes, service_types(name)")
        .eq("client_id", clientId)
        .order("service_date", { ascending: false })
        .limit(10),
      admin.from("appointments")
        .select("id, start_at, status, services(name)")
        .eq("client_id", clientId)
        .order("start_at", { ascending: false })
        .limit(10),
    ]);

    const cd = clientDetail.data as Record<string, unknown> | null;
    clientContext = {
      clientName: `${cd?.first_name || ""} ${cd?.last_name || ""}`.trim(),
      clientId,
      tags: cd?.tags || [],
      notes: cd?.notes || null,
      preferenceProfile: cd?.preference_profile || null,
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
    };
  }

  // --- Product data lookup (for inventory/reorder questions) ---
  const productKeywords = ["product", "stock", "inventory", "reorder", "running low", "low stock", "order", "supply"];
  const isProductQuestion = productKeywords.some(kw => messageLower.includes(kw));

  let productContext: Record<string, unknown> | null = null;
  if (isProductQuestion) {
    const { data: products } = await admin
      .from("products")
      .select("id, brand, shade, line, category, quantity, low_stock_threshold, size_oz, cost_cents, name")
      .eq("workspace_id", workspace.id)
      .order("quantity", { ascending: true })
      .limit(50);

    if (products && products.length > 0) {
      const lowStock = products.filter((p: Record<string, unknown>) =>
        (p.quantity as number) <= (p.low_stock_threshold as number || 3)
      );
      productContext = {
        totalProducts: products.length,
        lowStockProducts: lowStock.map((p: Record<string, unknown>) => ({
          brand: p.brand,
          shade: p.shade,
          line: p.line,
          name: p.name,
          category: p.category,
          quantity: p.quantity,
          threshold: p.low_stock_threshold,
          sizeOz: p.size_oz,
          costCents: p.cost_cents,
        })),
        allProducts: products.slice(0, 20).map((p: Record<string, unknown>) => ({
          brand: p.brand,
          shade: p.shade,
          line: p.line,
          name: p.name,
          category: p.category,
          quantity: p.quantity,
        })),
      };
    }
  }

  const fullWorkspaceContext = {
    ...workspaceContext,
    ...(clientContext ? { matchedClient: clientContext } : {}),
    ...(productContext ? { productInventory: productContext } : {}),
  };

  // Temporary debug: if message starts with "DEBUG:", return raw context as reply
  if (message.startsWith("DEBUG:")) {
    const debugData = {
      matchedClientName: (matchedClient as Record<string, unknown>)?.first_name ?? "NO MATCH",
      formulaCount: (clientContext?.formulaHistory as unknown[])?.length ?? 0,
      appointmentCount: (clientContext?.appointmentHistory as unknown[])?.length ?? 0,
      clientContext,
    };
    return NextResponse.json({
      reply: "```json\n" + JSON.stringify(debugData, null, 2) + "\n```",
    });
  }

  const result = await mentisChat({
    message,
    conversationHistory,
    context,
    workspaceContext: fullWorkspaceContext,
  });

  if (!result) {
    return NextResponse.json({ error: "Mentis unavailable" }, { status: 503 });
  }

  return NextResponse.json(result);
}
