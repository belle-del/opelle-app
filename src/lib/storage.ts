import type {
  Appointment,
  AppointmentInput,
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

export const getClients = (): Client[] => {
  ensureSeed();
  return readList<Client>(CLIENTS_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
};

export const listClients = (): Client[] => getClients();

export const getClientById = (id: string): Client | null => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  return clients.find((client) => client.id === id) ?? null;
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

export const listAppointments = (): Appointment[] => {
  ensureSeed();
  return readList<Appointment>(APPOINTMENTS_KEY, []).sort((a, b) =>
    a.startAt.localeCompare(b.startAt)
  );
};

export const saveAppointment = (input: AppointmentInput): Appointment[] => {
  ensureSeed();
  const now = new Date().toISOString();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const nextAppointments = input.id
    ? appointments.map((appointment) =>
        appointment.id === input.id
          ? { ...appointment, ...input, updatedAt: now }
          : appointment
      )
    : [
        ...appointments,
        {
          id: createId(),
          clientId: input.clientId,
          clientName: input.clientName,
          service: input.service,
          startAt: input.startAt,
          durationMinutes: input.durationMinutes,
          status: input.status,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        },
      ];

  writeList(APPOINTMENTS_KEY, nextAppointments);
  return nextAppointments;
};

export const deleteAppointment = (id: string): Appointment[] => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const next = appointments.filter((appointment) => appointment.id !== id);
  writeList(APPOINTMENTS_KEY, next);
  return next;
};

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
