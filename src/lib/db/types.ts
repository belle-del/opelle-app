import type { Appointment, Client, Formula, FormulaStep } from "@/lib/models";

export type ClientRow = {
  id: string;
  stylist_id: string;
  first_name: string;
  last_name: string | null;
  pronouns: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  invite_token: string | null;
  invite_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  stylist_id: string;
  client_id: string;
  service_name: string;
  start_at: string;
  duration_min: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FormulaRow = {
  id: string;
  stylist_id: string;
  client_id: string;
  appointment_id: string | null;
  service_type: "color" | "lighten" | "tone" | "gloss" | "other";
  title: string;
  color_line: string | null;
  notes: string | null;
  steps: FormulaStep[];
  created_at: string;
  updated_at: string;
};

export const clientRowToModel = (row: ClientRow): Client => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name ?? undefined,
  pronouns: row.pronouns ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  notes: row.notes ?? undefined,
  inviteToken: row.invite_token ?? undefined,
  inviteUpdatedAt: row.invite_updated_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const appointmentRowToModel = (row: AppointmentRow): Appointment => ({
  id: row.id,
  clientId: row.client_id,
  serviceName: row.service_name,
  startAt: row.start_at,
  durationMin: row.duration_min,
  status: row.status,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const formulaRowToModel = (row: FormulaRow): Formula => ({
  id: row.id,
  clientId: row.client_id,
  serviceType: row.service_type,
  title: row.title,
  colorLine: row.color_line ?? undefined,
  notes: row.notes ?? undefined,
  steps: row.steps ?? [],
  appointmentId: row.appointment_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const clientModelToRow = (
  client: Partial<Client> & { stylist_id?: string }
): Partial<ClientRow> => ({
  stylist_id: client.stylist_id,
  first_name: client.firstName?.trim() ?? "",
  last_name: client.lastName?.trim() || null,
  pronouns: client.pronouns?.trim() || null,
  phone: client.phone?.trim() || null,
  email: client.email?.trim() || null,
  notes: client.notes?.trim() || null,
  invite_token: client.inviteToken ?? null,
  invite_updated_at: client.inviteUpdatedAt ?? null,
});

export const appointmentModelToRow = (
  appointment: Partial<Appointment> & { stylist_id?: string }
): Partial<AppointmentRow> => ({
  stylist_id: appointment.stylist_id,
  client_id: appointment.clientId,
  service_name: appointment.serviceName?.trim() ?? "",
  start_at: appointment.startAt ?? new Date().toISOString(),
  duration_min: appointment.durationMin ?? 60,
  status: appointment.status ?? "scheduled",
  notes: appointment.notes?.trim() || null,
});

export const formulaModelToRow = (
  formula: Partial<Formula> & { stylist_id?: string }
): Partial<FormulaRow> => ({
  stylist_id: formula.stylist_id,
  client_id: formula.clientId,
  appointment_id: formula.appointmentId ?? null,
  service_type: formula.serviceType ?? "other",
  title: formula.title?.trim() ?? "",
  color_line: formula.colorLine?.trim() || null,
  notes: formula.notes?.trim() || null,
  steps: formula.steps ?? [],
});
