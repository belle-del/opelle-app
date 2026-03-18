import { listAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { V7Calendar } from "./_components/V7Calendar";
import { RebookRequestsList } from "./_components/RebookRequestsList";
import { AppointmentsTabs } from "./_components/AppointmentsTabs";

export default async function AppointmentsPage() {
  const [appointments, clients, workspace] = await Promise.all([
    listAppointments(),
    listClients(),
    getCurrentWorkspace(),
  ]);

  // Get rebook requests using admin client to bypass RLS
  let rebookRequests: Array<{
    id: string;
    client_id: string;
    service_type: string | null;
    preferred_dates: string[];
    notes: string | null;
    status: string;
    created_at: string;
  }> = [];

  if (workspace) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("rebook_requests")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[AppointmentsPage] Failed to fetch rebook requests:", error.message);
    }
    rebookRequests = data || [];
  }

  const pendingCount = rebookRequests.filter(r => r.status === "pending").length;

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>
          Schedule
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--text-on-bark)", fontWeight: 300 }}>
          Appointments
        </h2>
      </div>

      <AppointmentsTabs pendingRequestsCount={pendingCount}>
        {{
          calendar: <V7Calendar appointments={appointments} clients={clients} />,
          requests: (
            <RebookRequestsList
              requests={rebookRequests}
              clients={clients}
            />
          ),
        }}
      </AppointmentsTabs>
    </div>
  );
}
