import { listAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { V7Calendar } from "./_components/V7Calendar";
import { RebookRequestsList } from "./_components/RebookRequestsList";
import { AppointmentsTabs } from "./_components/AppointmentsTabs";
import { PendingConfirmationBanner } from "./_components/PendingConfirmationBanner";

const DAY_NAME_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default async function AppointmentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [appointments, clients, workspace] = await Promise.all([
    listAppointments(),
    listClients(),
    getCurrentWorkspace(),
  ]);

  // Get workspace ID + working hours — fallback to admin query if getCurrentWorkspace failed
  const admin = createSupabaseAdminClient();
  let workspaceId = workspace?.id;
  let workingHours: Record<string, { start: string; end: string; closed: boolean }> = {};
  let allowIndividual = false;
  if (!workspaceId) {
    const { data: ws } = await admin.from("workspaces").select("id, working_hours, allow_individual_availability").limit(1).single();
    workspaceId = ws?.id;
    allowIndividual = ws?.allow_individual_availability ?? false;
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  } else {
    const { data: ws } = await admin.from("workspaces").select("working_hours, allow_individual_availability").eq("id", workspaceId).single();
    allowIndividual = ws?.allow_individual_availability ?? false;
    if (ws?.working_hours && Object.keys(ws.working_hours).length > 0) workingHours = ws.working_hours;
  }

  // If individual availability is on, override workingHours with the current user's patterns
  if (allowIndividual && user && workspaceId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: patterns } = await admin
      .from("availability_patterns")
      .select("day_of_week, start_time, end_time")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .lte("effective_from", todayStr)
      .or(`effective_to.is.null,effective_to.gte.${todayStr}`);

    if (patterns && patterns.length > 0) {
      // Build workingHours from patterns — all 7 days, closed=true for days without a pattern
      const patternByDay: Record<number, { start_time: string; end_time: string }> = {};
      for (const p of patterns) patternByDay[p.day_of_week as number] = p as { start_time: string; end_time: string };

      const stylistHours: Record<string, { start: string; end: string; closed: boolean }> = {};
      for (let i = 0; i < 7; i++) {
        const p = patternByDay[i];
        stylistHours[DAY_NAME_MAP[i]] = p
          ? { start: (p.start_time as string).slice(0, 5), end: (p.end_time as string).slice(0, 5), closed: false }
          : { start: "09:00", end: "18:00", closed: true };
      }
      workingHours = stylistHours;
    }
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

  // Query pending appointments
  let pendingForBanner: Array<{ id: string; clientName: string; serviceName: string; startAt: string }> = [];
  if (workspaceId) {
    const { data: pendingAppts } = await admin
      .from("appointments")
      .select("id, service_name, start_at, client_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending_confirmation")
      .order("start_at", { ascending: true });

    // Fetch client names for pending
    const pendingClientIds = [...new Set((pendingAppts || []).map(a => a.client_id as string))];
    const clientNamesMap: Record<string, string> = {};
    if (pendingClientIds.length > 0) {
      const { data: pendingClients } = await admin
        .from("clients")
        .select("id, first_name, last_name")
        .in("id", pendingClientIds);
      for (const c of pendingClients || []) {
        clientNamesMap[c.id as string] = `${c.first_name} ${c.last_name || ""}`.trim();
      }
    }

    pendingForBanner = (pendingAppts || []).map(a => ({
      id: a.id as string,
      clientName: clientNamesMap[a.client_id as string] || "Client",
      serviceName: a.service_name as string,
      startAt: a.start_at as string,
    }));
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A" }}>
          Schedule
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
          Appointments
        </h2>
      </div>

      <PendingConfirmationBanner pending={pendingForBanner} />

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
