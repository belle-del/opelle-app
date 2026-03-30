import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { HoursDashboard } from "./_components/HoursDashboard";

export default async function HoursPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/app");

  const admin = createSupabaseAdminClient();

  const [totalsResult, entriesResult] = await Promise.all([
    admin
      .from("hour_totals")
      .select("student_id, student_name, total_hours, verified_hours, last_updated")
      .eq("workspace_id", workspaceId)
      .order("student_name", { ascending: true }),
    admin
      .from("time_entries")
      .select("id, student_id, student_name, clock_in, clock_out, duration_minutes, verified")
      .eq("workspace_id", workspaceId)
      .order("clock_in", { ascending: false })
      .limit(50),
  ]);

  const totals = (totalsResult.data || []).map((t: Record<string, unknown>) => ({
    studentId: t.student_id as string,
    studentName: (t.student_name as string) || "Unknown",
    totalHours: Number(t.total_hours) || 0,
    verifiedHours: Number(t.verified_hours) || 0,
    lastUpdated: t.last_updated as string,
  }));

  const entries = (entriesResult.data || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    studentId: e.student_id as string,
    studentName: (e.student_name as string) || "Unknown",
    clockIn: e.clock_in as string,
    clockOut: e.clock_out as string | null,
    durationMinutes: e.duration_minutes as number | null,
    verified: e.verified as boolean,
  }));

  return <HoursDashboard initialTotals={totals} initialEntries={entries} />;
}
