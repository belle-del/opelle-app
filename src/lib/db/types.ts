import type { Appointment, Client, Formula, FormulaStep } from "@/lib/models";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
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

const splitName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: "", lastName: undefined };
  const [firstName, ...rest] = trimmed.split(" ");
  const lastName = rest.join(" ").trim();
  return { firstName, lastName: lastName || undefined };
};

export const clientRowToModel = (row: ClientRow): Client => {
  const { firstName, lastName } = splitName(row.name);
  return {
    id: row.id,
    firstName,
    lastName,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.created_at,
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

export const clientModelToRow = (client: Partial<Client>): Partial<ClientRow> => {
  const name = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    name,
    email: client.email?.trim() || null,
    phone: client.phone?.trim() || null,
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
