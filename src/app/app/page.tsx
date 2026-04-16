import { listClients } from "@/lib/db/clients";
import { listAppointments } from "@/lib/db/appointments";
import { listFormulas } from "@/lib/db/formulas";
import { getPendingTasks } from "@/lib/db/tasks";
import { listProducts } from "@/lib/db/products";
import { getUnreviewedInspoFlags, getInspoAppointmentAlerts } from "@/lib/db/inspo";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveSession } from "@/lib/db/service-sessions";
import { WidgetDashboard } from "./_components/WidgetDashboard";
import { MetisSuggestions } from "./_components/MetisSuggestions";

export default async function DashboardPage() {
  const [clients, allAppointments, formulas, tasks, products, inspoFlags, appointmentAlerts, workspace] = await Promise.all([
    listClients(),
    listAppointments(),
    listFormulas(),
    getPendingTasks(),
    listProducts(),
    getUnreviewedInspoFlags(),
    getInspoAppointmentAlerts(),
    getCurrentWorkspace(),
  ]);

  // Get working hours + rebook requests
  let workingHours: Record<string, { start: string; end: string; closed: boolean }> = {};
  let rebookRequests: Array<{ id: string; client_id: string; service_type: string | null; status: string; created_at: string }> = [];
  const admin = createSupabaseAdminClient();
  let wsId = workspace?.id;
  if (!wsId) {
    const { data: ws } = await admin.from("workspaces").select("id, working_hours").limit(1).single();
    wsId = ws?.id;
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  } else {
    const { data: ws } = await admin.from("workspaces").select("working_hours").eq("id", wsId).single();
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  }
  if (wsId) {
    const { data } = await admin.from("rebook_requests").select("id, client_id, service_type, status, created_at").eq("workspace_id", wsId).order("created_at", { ascending: false });
    rebookRequests = data || [];
  }

  // Get active service session for current user
  let activeSession = null;
  let activeSessionClientName = "";
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      activeSession = await getActiveSession(user.id);
      if (activeSession) {
        const client = clients.find(c => c.id === activeSession!.clientId);
        activeSessionClientName = client
          ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
          : "Client";
      }
    }
  } catch {}

  return (
    <>
    <MetisSuggestions page="dashboard" entityType="dashboard" />
    <WidgetDashboard
      appointments={allAppointments}
      formulas={formulas}
      tasks={tasks}
      products={products}
      clients={clients}
      inspoFlags={inspoFlags}
      appointmentAlerts={appointmentAlerts}
      workingHours={workingHours}
      rebookRequests={rebookRequests}
      activeSession={activeSession}
      activeSessionClientName={activeSessionClientName}
    />
    </>
  );
}
