import type {
  Appointment,
  AppointmentStatus,
  Client,
  Formula,
  FormulaInput,
} from "@/lib/models";
import { getMockSeed } from "@/lib/mockSeed";

const KEY_PREFIX = "opelle:v1";
const CLIENTS_KEY = `${KEY_PREFIX}:clients`;
const APPOINTMENTS_KEY = `${KEY_PREFIX}:appointments`;
const FORMULAS_KEY = `${KEY_PREFIX}:formulas`;

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readList = <T>(key: string, fallback: T[]): T[] => {
  if (typeof window === "undefined") return fallback;
  return safeParse<T[]>(window.localStorage.getItem(key), fallback);
};

const writeList = <T>(key: string, value: T[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const ensureSeed = () => {
  if (typeof window === "undefined") return;
  if (
    window.localStorage.getItem(CLIENTS_KEY) ||
    window.localStorage.getItem(APPOINTMENTS_KEY) ||
    window.localStorage.getItem(FORMULAS_KEY)
  ) {
    return;
  }

  const seeded = getMockSeed();
  writeList(CLIENTS_KEY, seeded.clients);
  writeList(APPOINTMENTS_KEY, seeded.appointments);
  writeList(FORMULAS_KEY, seeded.formulas);
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeClient = (raw: Partial<Client>): Client => {
  const now = new Date().toISOString();
  const legacyName = (raw as { name?: string }).name ?? "";
  const [legacyFirst, ...legacyRest] = legacyName.trim().split(" ");
  const legacyLast = legacyRest.join(" ");
  const firstName = raw.firstName ?? legacyFirst ?? "";
  const lastName = raw.lastName ?? (legacyLast ? legacyLast : undefined);
  return {
    id: raw.id ?? createId(),
    firstName,
    lastName,
    pronouns: raw.pronouns ?? undefined,
    phone: raw.phone ?? undefined,
    email: raw.email ?? undefined,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};

export const getClients = (): Client[] => {
  ensureSeed();
  return readList<Client>(CLIENTS_KEY, [])
    .map((client) => normalizeClient(client))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const listClients = (): Client[] => getClients();

export const getClientById = (id: string): Client | null => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const match = clients.find((client) => client.id === id);
  return match ? normalizeClient(match) : null;
};

export const upsertClient = (client: Client): Client => {
  ensureSeed();
  const now = new Date().toISOString();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const exists = clients.some((item) => item.id === client.id);
  const nextClient: Client = {
    ...client,
    id: client.id || createId(),
    firstName: client.firstName.trim(),
    lastName: client.lastName?.trim() || undefined,
    pronouns: client.pronouns?.trim() || undefined,
    phone: client.phone?.trim() || undefined,
    email: client.email?.trim() || undefined,
    notes: client.notes?.trim() || undefined,
    createdAt: exists ? client.createdAt : now,
    updatedAt: now,
  };

  const nextClients = exists
    ? clients.map((item) => (item.id === nextClient.id ? nextClient : item))
    : [...clients, nextClient];

  writeList(CLIENTS_KEY, nextClients);
  return nextClient;
};

export const deleteClient = (id: string): void => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  writeList(
    CLIENTS_KEY,
    clients.filter((client) => client.id !== id)
  );
  writeList(
    APPOINTMENTS_KEY,
    appointments.filter((appointment) => appointment.clientId !== id)
  );
};

const normalizeStatus = (status: string | undefined): AppointmentStatus => {
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "scheduled";
};

const normalizeAppointment = (raw: Partial<Appointment>): Appointment => {
  const now = new Date().toISOString();
  return {
    id: raw.id ?? createId(),
    clientId: raw.clientId ?? "",
    serviceName: raw.serviceName ?? (raw as { service?: string }).service ?? "",
    startAt: raw.startAt ?? now,
    durationMin:
      raw.durationMin ?? (raw as { durationMinutes?: number }).durationMinutes ?? 60,
    status: normalizeStatus(raw.status),
    notes: raw.notes,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};

export const getAppointments = (): Appointment[] => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  return appointments
    .map((appointment) => normalizeAppointment(appointment))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
};

export const getAppointmentById = (id: string): Appointment | null => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const match = appointments.find((appointment) => appointment.id === id);
  return match ? normalizeAppointment(match) : null;
};

export const upsertAppointment = (appointment: Appointment): Appointment => {
  ensureSeed();
  const now = new Date().toISOString();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const exists = appointments.some((item) => item.id === appointment.id);
  const nextAppointment: Appointment = {
    ...appointment,
    id: appointment.id || createId(),
    serviceName: appointment.serviceName.trim(),
    notes: appointment.notes?.trim() || undefined,
    status: normalizeStatus(appointment.status),
    createdAt: exists ? appointment.createdAt : now,
    updatedAt: now,
  };

  const nextAppointments = exists
    ? appointments.map((item) =>
        item.id === nextAppointment.id ? nextAppointment : item
      )
    : [...appointments, nextAppointment];

  writeList(APPOINTMENTS_KEY, nextAppointments);
  return nextAppointment;
};

export const deleteAppointment = (id: string): void => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  writeList(
    APPOINTMENTS_KEY,
    appointments.filter((appointment) => appointment.id !== id)
  );
};

export const listAppointments = (): Appointment[] => getAppointments();

export const listFormulas = (): Formula[] => {
  ensureSeed();
  return readList<Formula>(FORMULAS_KEY, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
};

export const saveFormula = (input: FormulaInput): Formula[] => {
  ensureSeed();
  const now = new Date().toISOString();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  const nextFormulas = input.id
    ? formulas.map((formula) =>
        formula.id === input.id
          ? { ...formula, ...input, updatedAt: now }
          : formula
      )
    : [
        ...formulas,
        {
          id: createId(),
          clientName: input.clientName,
          service: input.service,
          colorLine: input.colorLine,
          grams: input.grams,
          developer: input.developer,
          processingTime: input.processingTime,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        },
      ];

  writeList(FORMULAS_KEY, nextFormulas);
  return nextFormulas;
};

export const deleteFormula = (id: string): Formula[] => {
  ensureSeed();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  const next = formulas.filter((formula) => formula.id !== id);
  writeList(FORMULAS_KEY, next);
  return next;
};
