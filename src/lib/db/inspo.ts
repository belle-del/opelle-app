import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "./workspaces";

export type InspoFlag = {
  id: string;
  clientId: string;
  stylistFlag: string | null;
  createdAt: string;
};

export type InspoAppointmentAlert = {
  id: string;
  clientId: string;
  severity: "warning" | "critical";
  message: string;
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
  createdAt: string;
};

export async function getUnreviewedInspoFlags(): Promise<InspoFlag[]> {
  const admin = createSupabaseAdminClient();
  let wsId: string | undefined;

  const workspace = await getCurrentWorkspace();
  if (workspace) {
    wsId = workspace.id;
  } else {
    const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
    wsId = ws?.id;
  }
  if (!wsId) return [];

  const { data, error } = await admin
    .from("inspo_submissions")
    .select("id, client_id, stylist_flag, created_at")
    .eq("workspace_id", wsId)
    .eq("requires_consult", true)
    .eq("reviewed_by_stylist", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    stylistFlag: row.stylist_flag,
    createdAt: row.created_at,
  }));
}

export async function getInspoAppointmentAlerts(): Promise<InspoAppointmentAlert[]> {
  const admin = createSupabaseAdminClient();
  let wsId: string | undefined;

  const workspace = await getCurrentWorkspace();
  if (workspace) {
    wsId = workspace.id;
  } else {
    const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
    wsId = ws?.id;
  }
  if (!wsId) return [];

  // Get recent inspo submissions that have appointment flags
  const { data, error } = await admin
    .from("inspo_submissions")
    .select("id, client_id, ai_analysis, created_at")
    .eq("workspace_id", wsId)
    .eq("reviewed_by_stylist", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const alerts: InspoAppointmentAlert[] = [];
  for (const row of data) {
    const analysis = row.ai_analysis as { appointmentFlag?: { severity: string; message: string; nextAppointment: { serviceName: string; durationMins: number; startAt: string } } } | null;
    if (analysis?.appointmentFlag) {
      alerts.push({
        id: row.id,
        clientId: row.client_id,
        severity: analysis.appointmentFlag.severity as "warning" | "critical",
        message: analysis.appointmentFlag.message,
        nextAppointment: analysis.appointmentFlag.nextAppointment,
        createdAt: row.created_at,
      });
    }
  }

  return alerts;
}
