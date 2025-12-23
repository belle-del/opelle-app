import type {
  Appointment,
  AppointmentInput,
  Client,
  ClientInput,
  Formula,
  FormulaInput,
  StorageState,
} from "@/lib/models";
import { getMockSeed } from "@/lib/mockSeed";

const STORAGE_KEY = "opelle.storage.v1";
const STORAGE_VERSION = 1;

const emptyState = (): StorageState => ({
  version: STORAGE_VERSION,
  clients: [],
  appointments: [],
  formulas: [],
});

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeState = (state: StorageState): StorageState => ({
  version: STORAGE_VERSION,
  clients: Array.isArray(state.clients) ? state.clients : [],
  appointments: Array.isArray(state.appointments) ? state.appointments : [],
  formulas: Array.isArray(state.formulas) ? state.formulas : [],
});

const safeParse = (raw: string | null): StorageState | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StorageState;
  } catch {
    return null;
  }
};

export const readStorage = (): StorageState => {
  if (typeof window === "undefined") {
    return emptyState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = getMockSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return normalizeState(seeded);
  }

  const parsed = safeParse(raw);
  if (!parsed || parsed.version !== STORAGE_VERSION) {
    const seeded = getMockSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return normalizeState(seeded);
  }

  return normalizeState(parsed);
};

export const writeStorage = (state: StorageState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const updateStorage = (updater: (state: StorageState) => StorageState) => {
  const current = readStorage();
  const next = updater(current);
  writeStorage(next);
  return next;
};

export const listClients = (): Client[] =>
  readStorage().clients.slice().sort((a, b) => a.name.localeCompare(b.name));

export const getClientById = (id: string): Client | undefined =>
  readStorage().clients.find((client) => client.id === id);

export const saveClient = (input: ClientInput): Client[] => {
  const now = new Date().toISOString();
  return updateStorage((state) => {
    let clients = state.clients.slice();
    if (input.id) {
      clients = clients.map((client) =>
        client.id === input.id
          ? { ...client, ...input, updatedAt: now }
          : client
      );
    } else {
      const newClient: Client = {
        id: createId(),
        name: input.name,
        pronouns: input.pronouns,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      clients = [...clients, newClient];
    }
    return { ...state, clients };
  }).clients;
};

export const deleteClient = (id: string): Client[] => {
  return updateStorage((state) => ({
    ...state,
    clients: state.clients.filter((client) => client.id !== id),
    appointments: state.appointments.filter(
      (appointment) => appointment.clientId !== id
    ),
  })).clients;
};

export const listAppointments = (): Appointment[] =>
  readStorage()
    .appointments.slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

export const saveAppointment = (input: AppointmentInput): Appointment[] => {
  const now = new Date().toISOString();
  return updateStorage((state) => {
    let appointments = state.appointments.slice();
    if (input.id) {
      appointments = appointments.map((appointment) =>
        appointment.id === input.id
          ? { ...appointment, ...input, updatedAt: now }
          : appointment
      );
    } else {
      const newAppointment: Appointment = {
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
      };
      appointments = [...appointments, newAppointment];
    }
    return { ...state, appointments };
  }).appointments;
};

export const deleteAppointment = (id: string): Appointment[] => {
  return updateStorage((state) => ({
    ...state,
    appointments: state.appointments.filter(
      (appointment) => appointment.id !== id
    ),
  })).appointments;
};

export const listFormulas = (): Formula[] =>
  readStorage()
    .formulas.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const saveFormula = (input: FormulaInput): Formula[] => {
  const now = new Date().toISOString();
  return updateStorage((state) => {
    let formulas = state.formulas.slice();
    if (input.id) {
      formulas = formulas.map((formula) =>
        formula.id === input.id
          ? { ...formula, ...input, updatedAt: now }
          : formula
      );
    } else {
      const newFormula: Formula = {
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
      };
      formulas = [...formulas, newFormula];
    }
    return { ...state, formulas };
  }).formulas;
};

export const deleteFormula = (id: string): Formula[] => {
  return updateStorage((state) => ({
    ...state,
    formulas: state.formulas.filter((formula) => formula.id !== id),
  })).formulas;
};
