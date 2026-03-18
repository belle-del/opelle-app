import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Appointment, AppointmentRow, AppointmentStatus } from "@/lib/types";
import { appointmentRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";
import { publishEvent } from "@/lib/kernel";

export async function listAppointments(): Promise<Appointment[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("start_at", { ascending: false });

  if (error || !data) return [];
  return (data as AppointmentRow[]).map(appointmentRowToModel);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return appointmentRowToModel(data as AppointmentRow);
}

export async function getAppointmentsForClient(clientId: string): Promise<Appointment[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("client_id", clientId)
    .order("start_at", { ascending: false });

  if (error || !data) return [];
  return (data as AppointmentRow[]).map(appointmentRowToModel);
}

export async function getUpcomingAppointments(limit = 10): Promise<Appointment[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("workspace_id", workspace.id)
    .gte("start_at", new Date().toISOString())
    .eq("status", "scheduled")
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as AppointmentRow[]).map(appointmentRowToModel);
}

export async function createAppointment(input: {
  clientId: string;
  serviceName: string;
  startAt: string;
  durationMins?: number;
  notes?: string;
  serviceId?: string;
  workspaceId?: string;
}): Promise<Appointment | null> {
  let wsId = input.workspaceId;
  if (!wsId) {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      // Final fallback: get first workspace via admin
      const admin = createSupabaseAdminClient();
      const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
      wsId = ws?.id;
    } else {
      wsId = workspace.id;
    }
  }
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .insert({
      workspace_id: wsId,
      client_id: input.clientId,
      service_name: input.serviceName,
      start_at: input.startAt,
      duration_mins: input.durationMins || 60,
      notes: input.notes || null,
      service_id: input.serviceId || null,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  const appointment = appointmentRowToModel(data as AppointmentRow);

  // Fire kernel event (non-blocking)
  publishEvent({
    event_type: "appointment_scheduled",
    workspace_id: wsId,
    timestamp: new Date().toISOString(),
    payload: {
      appointment_id: appointment.id,
      client_id: input.clientId,
      service_name: input.serviceName,
      start_at: input.startAt,
      duration_mins: appointment.durationMins,
    },
  });

  return appointment;
}

export async function updateAppointment(
  id: string,
  input: {
    clientId?: string;
    serviceName?: string;
    startAt?: string;
    durationMins?: number;
    notes?: string;
    status?: AppointmentStatus;
  }
): Promise<Appointment | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();

  const updateData: Record<string, unknown> = {};
  if (input.clientId !== undefined) updateData.client_id = input.clientId;
  if (input.serviceName !== undefined) updateData.service_name = input.serviceName;
  if (input.startAt !== undefined) updateData.start_at = input.startAt;
  if (input.durationMins !== undefined) updateData.duration_mins = input.durationMins;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;

  const appointment = appointmentRowToModel(data as AppointmentRow);

  // Fire kernel event when appointment is completed (non-blocking)
  if (input.status === "completed") {
    publishEvent({
      event_type: "appointment_completed",
      workspace_id: workspace.id,
      timestamp: new Date().toISOString(),
      payload: {
        appointment_id: appointment.id,
        client_id: appointment.clientId,
        service_name: appointment.serviceName,
        start_at: appointment.startAt,
        duration_mins: appointment.durationMins,
        service_log: null,
        formula_entry_ids: [],
      },
    });
  }

  // Fire kernel event when appointment is cancelled
  if (input.status === "cancelled") {
    publishEvent({
      event_type: "appointment_cancelled",
      workspace_id: workspace.id,
      timestamp: new Date().toISOString(),
      payload: {
        appointment_id: appointment.id,
        client_id: appointment.clientId,
        service_name: appointment.serviceName,
        original_start_at: appointment.startAt,
      },
    });
  }

  // Fire kernel event when appointment is rescheduled
  if (input.startAt && input.startAt !== (data as AppointmentRow).start_at) {
    publishEvent({
      event_type: "appointment_rescheduled",
      workspace_id: workspace.id,
      timestamp: new Date().toISOString(),
      payload: {
        appointment_id: appointment.id,
        client_id: appointment.clientId,
        original_start_at: (data as AppointmentRow).start_at,
        new_start_at: input.startAt,
      },
    });
  }

  return appointment;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}
