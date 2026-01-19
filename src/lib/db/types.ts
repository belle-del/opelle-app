import type { Appointment, Client, Formula, FormulaStep } from "@/lib/models";

export type ClientRow = {
  id: string;
  stylist_id: string;
  first_name: string;
  last_name: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  invite_token: string | null;
  invite_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  client_id: string;
  starts_at: string;
  service: string;
  notes: string | null;
  created_at: string;
};

export type FormulaRow = {
  id: string;
  client_id: string;
  title: string;
  product_lines: FormulaStep[];
  notes: string | null;
  created_at: string;
};

export const clientRowToModel = (row: ClientRow): Client => {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    pronouns: row.pronouns ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const appointmentRowToModel = (row: AppointmentRow): Appointment => ({
  id: row.id,
  clientId: row.client_id,
  serviceName: row.service,
  startAt: row.starts_at,
  durationMin: 60,
  status: "scheduled",
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.created_at,
});

export const formulaRowToModel = (row: FormulaRow): Formula => ({
  id: row.id,
  clientId: row.client_id,
  serviceType: "other",
  title: row.title,
  steps: Array.isArray(row.product_lines) ? row.product_lines : [],
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.created_at,
});

export const clientModelToRow = (client: Partial<Client>, stylistId?: string): Partial<ClientRow> => {
  return {
    stylist_id: stylistId,
    first_name: client.firstName?.trim() ?? "",
    last_name: client.lastName?.trim() || null,
    pronouns: client.pronouns?.trim() || null,
    email: client.email?.trim() || null,
    phone: client.phone?.trim() || null,
    notes: client.notes?.trim() || null,
  };
};

export const appointmentModelToRow = (
  appointment: Partial<Appointment>
): Partial<AppointmentRow> => ({
  client_id: appointment.clientId,
  starts_at: appointment.startAt ?? new Date().toISOString(),
  service: appointment.serviceName?.trim() ?? "",
  notes: appointment.notes?.trim() || null,
});

export const formulaModelToRow = (
  formula: Partial<Formula>
): Partial<FormulaRow> => ({
  client_id: formula.clientId,
  title: formula.title?.trim() ?? "",
  product_lines: formula.steps ?? [],
  notes: formula.notes?.trim() || null,
});
