import type {
  Appointment,
  Client,
  Formula,
  OpelleBackupV1,
} from "@/lib/models";
import { formatDbError } from "@/lib/db/health";

const reportDbError = (error: unknown) => {
  if (typeof window !== "undefined") {
    const message = formatDbError(error);
    window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
  }
  if (error instanceof Error) {
    console.error(error);
  }
};

const fetchDb = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "DB request failed");
  }
  return json.data as T;
};

export const getClients = async (): Promise<Client[]> => {
  try {
    return (await fetchDb<Client[]>("/api/db/clients")) ?? [];
  } catch (error) {
    reportDbError(error);
    return [];
  }
};

export const listClients = async (): Promise<Client[]> => getClients();

export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    return await fetchDb<Client | null>(`/api/db/clients/${id}`);
  } catch (error) {
    reportDbError(error);
    return null;
  }
};

export const upsertClient = async (client: Client): Promise<Client> => {
  const payload = {
    firstName: client.firstName,
    lastName: client.lastName,
    pronouns: client.pronouns,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
  };
  try {
    if (client.id) {
      return await fetchDb<Client>(`/api/db/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
    return await fetchDb<Client>("/api/db/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    reportDbError(error);
    return client;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    await fetchDb(`/api/db/clients/${id}`, { method: "DELETE" });
  } catch (error) {
    reportDbError(error);
  }
};

export const ensureClientInviteToken = async (clientId: string) => {
  try {
    return await fetchDb<{ token: string; updatedAt: string }>(
      `/api/db/clients/${clientId}/invite`,
      {
        method: "POST",
        body: JSON.stringify({ action: "ensure" }),
      }
    );
  } catch (error) {
    reportDbError(error);
    return { token: "", updatedAt: "" };
  }
};

export const regenerateClientInviteToken = async (clientId: string) => {
  try {
    return await fetchDb<{ token: string; updatedAt: string }>(
      `/api/db/clients/${clientId}/invite`,
      {
        method: "POST",
        body: JSON.stringify({ action: "regenerate" }),
      }
    );
  } catch (error) {
    reportDbError(error);
    return { token: "", updatedAt: "" };
  }
};

export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    return (await fetchDb<Appointment[]>("/api/db/appointments")) ?? [];
  } catch (error) {
    reportDbError(error);
    return [];
  }
};

export const listAppointments = async (): Promise<Appointment[]> =>
  getAppointments();

export const getAppointmentById = async (
  id: string
): Promise<Appointment | null> => {
  try {
    return await fetchDb<Appointment | null>(`/api/db/appointments/${id}`);
  } catch (error) {
    reportDbError(error);
    return null;
  }
};

export const upsertAppointment = async (
  appointment: Appointment
): Promise<Appointment> => {
  const payload = {
    clientId: appointment.clientId,
    serviceName: appointment.serviceName,
    startAt: appointment.startAt,
    durationMin: appointment.durationMin,
    status: appointment.status,
    notes: appointment.notes,
  };
  try {
    if (appointment.id) {
      return await fetchDb<Appointment>(
        `/api/db/appointments/${appointment.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );
    }
    return await fetchDb<Appointment>("/api/db/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    reportDbError(error);
    return appointment;
  }
};

export const deleteAppointment = async (id: string): Promise<void> => {
  try {
    await fetchDb(`/api/db/appointments/${id}`, { method: "DELETE" });
  } catch (error) {
    reportDbError(error);
  }
};

export const getFormulas = async (): Promise<Formula[]> => {
  try {
    return (await fetchDb<Formula[]>("/api/db/formulas")) ?? [];
  } catch (error) {
    reportDbError(error);
    return [];
  }
};

export const listFormulas = async (): Promise<Formula[]> => getFormulas();

export const getFormulaById = async (id: string): Promise<Formula | null> => {
  try {
    return await fetchDb<Formula | null>(`/api/db/formulas/${id}`);
  } catch (error) {
    reportDbError(error);
    return null;
  }
};

export const upsertFormula = async (formula: Formula): Promise<Formula> => {
  const payload = {
    clientId: formula.clientId,
    serviceType: formula.serviceType,
    title: formula.title,
    colorLine: formula.colorLine,
    steps: formula.steps,
    appointmentId: formula.appointmentId,
    notes: formula.notes,
  };
  try {
    if (formula.id) {
      return await fetchDb<Formula>(`/api/db/formulas/${formula.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
    return await fetchDb<Formula>("/api/db/formulas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    reportDbError(error);
    return formula;
  }
};

export const deleteFormula = async (id: string): Promise<void> => {
  try {
    await fetchDb(`/api/db/formulas/${id}`, { method: "DELETE" });
  } catch (error) {
    reportDbError(error);
  }
};

export const exportBackup = async (): Promise<OpelleBackupV1> => {
  const [clients, appointments, formulas] = await Promise.all([
    getClients(),
    getAppointments(),
    getFormulas(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    clients,
    appointments,
    formulas,
  };
};

export const importBackup = async (): Promise<
  { ok: true } | { ok: false; error: string }
> => {
  return { ok: false, error: "DB mode import not supported yet." };
};

export const resetAll = (): void => {};
