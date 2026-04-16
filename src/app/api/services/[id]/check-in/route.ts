import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createSession } from "@/lib/db/service-sessions";
import { logActivity } from "@/lib/db/activity-log";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Check permission
    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const role: TeamRole = workspace?.owner_id === user.id
      ? "owner"
      : (member?.role as TeamRole) || "stylist";
    const overrides = member?.permissions as Record<string, boolean> | undefined;

    if (!hasPermission(role, "services.check_in", overrides) && !hasPermission(role, "appointments.manage", overrides)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get appointment details
    const { data: appointment } = await admin
      .from("appointments")
      .select("id, client_id, service_name, workspace_id")
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const stylistId = body.stylistId || user.id;

    const session = await createSession({
      workspaceId,
      appointmentId,
      clientId: appointment.client_id,
      stylistId,
      serviceName: appointment.service_name || "",
      checkedInBy: user.id,
    });

    if (!session) {
      return NextResponse.json({ error: "Failed to create service session" }, { status: 500 });
    }

    // Update floor_status if it exists for this stylist
    await admin
      .from("floor_status")
      .update({
        status: "with_client",
        current_client_id: appointment.client_id,
        current_service: appointment.service_name,
        status_changed_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("student_id", stylistId);

    await logActivity("service.checked_in", "service_session", session.id, `Check-in: ${appointment.service_name}`);

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
