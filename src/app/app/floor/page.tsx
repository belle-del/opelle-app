import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { FloorView } from "./_components/FloorView";

export default async function FloorPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/app");

  const admin = createSupabaseAdminClient();

  // Fetch floor status + clients in parallel
  const [floorResult, clientsResult] = await Promise.all([
    admin
      .from("floor_status")
      .select("id, student_id, student_name, status, current_client_id, current_service, status_changed_at, clocked_in_at, clients(first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .order("student_name", { ascending: true }),
    admin
      .from("clients")
      .select("id, first_name, last_name")
      .eq("workspace_id", workspaceId)
      .order("first_name", { ascending: true }),
  ]);

  const now = new Date();
  const students = (floorResult.data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    studentId: s.student_id as string,
    studentName: (s.student_name as string) || "Unknown",
    status: s.status as "clocked_out" | "available" | "with_client" | "on_break",
    currentClient: s.current_client_id
      ? {
          id: s.current_client_id as string,
          name: `${(s.clients as Record<string, unknown>)?.first_name || ""} ${(s.clients as Record<string, unknown>)?.last_name || ""}`.trim() || "Unknown",
        }
      : null,
    currentService: (s.current_service as string) || null,
    statusChangedAt: s.status_changed_at as string,
    clockedInAt: s.clocked_in_at as string | null,
    waitingMinutes: s.status === "available" && s.status_changed_at
      ? Math.round((now.getTime() - new Date(s.status_changed_at as string).getTime()) / 60000)
      : null,
  }));

  const clients = (clientsResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
  }));

  return <FloorView initialStudents={students} clients={clients} />;
}
