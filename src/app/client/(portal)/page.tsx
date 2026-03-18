import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublishedContent } from "@/lib/db/content";
import { HomeDashboard } from "./_components/HomeDashboard";

export default async function ClientHomePage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const admin = createSupabaseAdminClient();

  // Next appointment
  const { data: nextAppointment } = await admin
    .from("appointments")
    .select("*")
    .eq("client_id", ctx.clientUser.clientId)
    .eq("status", "scheduled")
    .gt("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Last completed visit
  const { data: lastVisit } = await admin
    .from("appointments")
    .select("*")
    .eq("client_id", ctx.clientUser.clientId)
    .eq("status", "completed")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Unread notifications (action items)
  const { data: unreadNotifications } = await admin
    .from("client_notifications")
    .select("*")
    .eq("client_id", ctx.clientUser.clientId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Check for shared formula on last visit
  let hasSharedFormula = false;
  if (lastVisit) {
    const { data: formulaEntry } = await admin
      .from("formula_entries")
      .select("id, share_with_client")
      .eq("client_id", ctx.clientUser.clientId)
      .eq("share_with_client", true)
      .order("service_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    hasSharedFormula = !!formulaEntry;
  }

  // Recent content posts (limit 3)
  const allContent = await getPublishedContent(ctx.clientUser.workspaceId);
  const recentContent = allContent.slice(0, 3);

  return (
    <HomeDashboard
      clientFirstName={ctx.client.firstName}
      stylistName={ctx.stylistName}
      nextAppointment={nextAppointment}
      lastVisit={lastVisit}
      unreadNotifications={unreadNotifications || []}
      hasSharedFormula={hasSharedFormula}
      recentContent={recentContent}
    />
  );
}
