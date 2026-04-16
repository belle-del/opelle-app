import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceSession, ServiceSessionRow, ServiceSessionStatus } from "@/lib/types";
import { serviceSessionRowToModel, SERVICE_SESSION_TRANSITIONS } from "@/lib/types";
import { getWorkspaceId } from "./get-workspace-id";
import { publishEvent } from "@/lib/kernel";

export async function getActiveSession(userId: string): Promise<ServiceSession | null> {
  const wsId = await getWorkspaceId(userId);
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_sessions")
    .select("*")
    .eq("workspace_id", wsId)
    .eq("stylist_id", userId)
    .neq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return serviceSessionRowToModel(data as ServiceSessionRow);
}

export async function getActiveSessionsForWorkspace(workspaceId: string): Promise<ServiceSession[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .neq("status", "complete")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ServiceSessionRow[]).map(serviceSessionRowToModel);
}

export async function getSession(sessionId: string, workspaceId: string): Promise<ServiceSession | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) return null;
  return serviceSessionRowToModel(data as ServiceSessionRow);
}

export async function createSession(input: {
  workspaceId: string;
  appointmentId?: string;
  clientId: string;
  stylistId: string;
  serviceName: string;
  checkedInBy?: string;
}): Promise<ServiceSession | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("service_sessions")
    .insert({
      workspace_id: input.workspaceId,
      appointment_id: input.appointmentId || null,
      client_id: input.clientId,
      stylist_id: input.stylistId,
      service_name: input.serviceName,
      status: "checked_in",
      checked_in_at: now,
      checked_in_by: input.checkedInBy || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create service session:", error);
    return null;
  }

  const session = serviceSessionRowToModel(data as ServiceSessionRow);

  // Fire kernel event (fire-and-forget)
  publishEvent({
    event_type: "service.checked_in",
    workspace_id: input.workspaceId,
    timestamp: now,
    payload: {
      session_id: session.id,
      appointment_id: input.appointmentId ?? null,
      client_id: input.clientId,
      stylist_id: input.stylistId,
      service_name: input.serviceName,
    },
  }).catch(() => {});

  return session;
}

export async function updateSessionStatus(
  sessionId: string,
  workspaceId: string,
  newStatus: ServiceSessionStatus,
  extras?: Record<string, unknown>
): Promise<ServiceSession | null> {
  const admin = createSupabaseAdminClient();

  // Get current session to validate transition
  const { data: current } = await admin
    .from("service_sessions")
    .select("status")
    .eq("id", sessionId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!current) return null;

  const currentStatus = current.status as ServiceSessionStatus;
  const validNextStates = SERVICE_SESSION_TRANSITIONS[currentStatus];
  if (!validNextStates.includes(newStatus)) {
    console.error(`Invalid transition: ${currentStatus} → ${newStatus}`);
    return null;
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...extras,
  };

  // Auto-set timestamps based on status
  if (newStatus === "in_progress" && !extras?.started_at) {
    updateData.started_at = new Date().toISOString();
  }
  if (newStatus === "processing") {
    updateData.processing_started_at = new Date().toISOString();
  }
  if (newStatus === "needs_help") {
    updateData.help_requested = true;
  }
  if (newStatus === "complete") {
    updateData.completed_at = new Date().toISOString();
  }
  // Clear help flag when moving out of needs_help
  if (currentStatus === "needs_help" && newStatus !== "needs_help") {
    updateData.help_requested = false;
  }

  const { data, error } = await admin
    .from("service_sessions")
    .update(updateData)
    .eq("id", sessionId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error || !data) return null;

  const session = serviceSessionRowToModel(data as ServiceSessionRow);

  // Fire kernel event
  publishEvent({
    event_type: "service.status_changed",
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    payload: {
      session_id: sessionId,
      previous_status: currentStatus,
      new_status: newStatus,
      client_id: session.clientId,
      stylist_id: session.stylistId,
    },
  }).catch(() => {});

  return session;
}

export async function completeSession(
  sessionId: string,
  workspaceId: string,
  afterPhotoUrl?: string
): Promise<ServiceSession | null> {
  const extras: Record<string, unknown> = {};
  if (afterPhotoUrl) extras.after_photo_url = afterPhotoUrl;

  return updateSessionStatus(sessionId, workspaceId, "complete", extras);
}
