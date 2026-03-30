import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    const { data: students, error } = await admin
      .from("floor_status")
      .select("id, student_id, student_name, status, current_client_id, current_service, status_changed_at, clocked_in_at, clients(first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .order("student_name", { ascending: true });

    if (error) {
      console.error("Floor status fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch floor status" }, { status: 500 });
    }

    const now = new Date();
    const result = (students || []).map((s: Record<string, unknown>) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: s.student_name || "Unknown",
      status: s.status,
      currentClient: s.current_client_id
        ? {
            id: s.current_client_id,
            name: `${(s.clients as Record<string, unknown>)?.first_name || ""} ${(s.clients as Record<string, unknown>)?.last_name || ""}`.trim() || "Unknown",
          }
        : null,
      currentService: s.current_service || null,
      statusChangedAt: s.status_changed_at,
      clockedInAt: s.clocked_in_at,
      waitingMinutes: s.status === "available" && s.status_changed_at
        ? Math.round((now.getTime() - new Date(s.status_changed_at as string).getTime()) / 60000)
        : null,
    }));

    return NextResponse.json({ students: result });
  } catch (err) {
    console.error("Floor route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
