import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ starters: [] });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ starters: [] });

  const starters: string[] = [];

  // Check for upcoming appointments today/tomorrow
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  const { data: upcomingAppts } = await supabase
    .from("appointments")
    .select("id, start_at, clients(first_name), services(name)")
    .eq("workspace_id", workspace.id)
    .gte("start_at", now.toISOString())
    .lte("start_at", tomorrow.toISOString())
    .order("start_at", { ascending: true })
    .limit(3);

  if (upcomingAppts && upcomingAppts.length > 0) {
    const first = upcomingAppts[0] as Record<string, unknown>;
    const clientName = (first.clients as Record<string, unknown>)?.first_name as string;
    const serviceName = (first.services as Record<string, unknown>)?.name as string;
    if (clientName && serviceName) {
      starters.push(`Help me prep for ${clientName}'s ${serviceName} appointment`);
    }
  }

  // Check for low stock products
  const { data: lowStock } = await supabase
    .from("products")
    .select("id, brand, shade, quantity, low_stock_threshold")
    .eq("workspace_id", workspace.id)
    .limit(100);

  const lowStockProducts = (lowStock || []).filter(
    (p: Record<string, unknown>) => (p.quantity as number) <= (p.low_stock_threshold as number || 3)
  );
  if (lowStockProducts.length > 0) {
    starters.push(`I have ${lowStockProducts.length} products running low — what should I reorder first?`);
  }

  // Check for clients who haven't visited in a while (potential rebooks)
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const { data: overdueClients, count: overdueCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .lt("last_visit_at", sixWeeksAgo.toISOString());

  if (overdueCount && overdueCount > 0) {
    starters.push(`Who's overdue for a rebook? (${overdueCount} clients)`);
  }

  // Check unread messages
  const { count: unreadCount } = await supabase
    .from("message_threads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .gt("unread_stylist", 0);

  if (unreadCount && unreadCount > 0) {
    starters.push(`I have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''} — summarize them`);
  }

  // Always include some general salon knowledge starters as fallbacks
  const fallbacks = [
    "What's the best way to price a balayage service?",
    "Suggest a formula for warm copper tones",
    "How do I handle a color correction consultation?",
    "Tips for improving client retention",
  ];

  // Fill remaining spots with fallbacks (aim for 4 total)
  while (starters.length < 4 && fallbacks.length > 0) {
    const idx = Math.floor(Math.random() * fallbacks.length);
    starters.push(fallbacks.splice(idx, 1)[0]);
  }

  return NextResponse.json({ starters: starters.slice(0, 4) }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
