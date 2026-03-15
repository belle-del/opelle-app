import { listClients } from "@/lib/db/clients";
import { listAppointments } from "@/lib/db/appointments";
import { listFormulas } from "@/lib/db/formulas";
import { getPendingTasks } from "@/lib/db/tasks";
import { listProducts } from "@/lib/db/products";
import { getUnreviewedInspoFlags } from "@/lib/db/inspo";
import { WidgetDashboard } from "./_components/WidgetDashboard";
import { MentisSuggestions } from "./_components/MentisSuggestions";

export default async function DashboardPage() {
  const [clients, allAppointments, formulas, tasks, products, inspoFlags] = await Promise.all([
    listClients(),
    listAppointments(),
    listFormulas(),
    getPendingTasks(),
    listProducts(),
    getUnreviewedInspoFlags(),
  ]);

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
    />
    </>
  );
}
