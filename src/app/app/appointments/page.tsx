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

  // Get workspace ID + working hours — fallback to admin query if getCurrentWorkspace failed
  const admin = createSupabaseAdminClient();
  let workspaceId = workspace?.id;
  let workingHours: Record<string, { start: string; end: string; closed: boolean }> = {};
  if (!workspaceId) {
    const { data: ws } = await admin.from("workspaces").select("id, working_hours").limit(1).single();
    workspaceId = ws?.id;
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  } else {
    const { data: ws } = await admin.from("workspaces").select("working_hours").eq("id", workspaceId).single();
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  }

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

  if (workspaceId) {
    const { data, error } = await admin
      .from("rebook_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
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
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)" }}>
          Schedule
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
          Appointments
        </h2>
      </div>

      <AppointmentsTabs pendingRequestsCount={pendingCount}>
        {{
          calendar: <V7Calendar appointments={appointments} clients={clients} workingHours={workingHours} />,
          requests: (
            <RebookRequestsList
              requests={rebookRequests}
              clients={clients}
              workspaceId={workspaceId || ""}
            />
          ),
        }}
      </AppointmentsTabs>
    </div>
  );
}
