import { listClients } from "@/lib/db/clients";
import { listAppointments } from "@/lib/db/appointments";
import { listFormulas } from "@/lib/db/formulas";
import { getPendingTasks } from "@/lib/db/tasks";
import { listProducts } from "@/lib/db/products";
import { getUnreviewedInspoFlags } from "@/lib/db/inspo";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WidgetDashboard } from "./_components/WidgetDashboard";
import { MentisSuggestions } from "./_components/MentisSuggestions";

export default async function DashboardPage() {
  const [clients, allAppointments, formulas, tasks, products, inspoFlags, workspace] = await Promise.all([
    listClients(),
    listAppointments(),
    listFormulas(),
    getPendingTasks(),
    listProducts(),
    getUnreviewedInspoFlags(),
    getCurrentWorkspace(),
  ]);

  // Get working hours
  let workingHours: Record<string, { start: string; end: string; closed: boolean }> = {};
  const admin = createSupabaseAdminClient();
  const wsId = workspace?.id;
  if (wsId) {
    const { data: ws } = await admin.from("workspaces").select("working_hours").eq("id", wsId).single();
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  } else {
    const { data: ws } = await admin.from("workspaces").select("working_hours").limit(1).single();
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  }

  return (
    <>
    <MentisSuggestions page="dashboard" entityType="dashboard" />
    <WidgetDashboard
      appointments={allAppointments}
      formulas={formulas}
      tasks={tasks}
      products={products}
      clients={clients}
      inspoFlags={inspoFlags}
      workingHours={workingHours}
    />
    </>
  );
}
