import type {
  Appointment,
  AppointmentStatus,
  Client,
  Formula,
  FormulaServiceType,
  FormulaStep,
  OpelleBackupV1,
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
    inviteToken: raw.inviteToken ?? undefined,
    inviteUpdatedAt: raw.inviteUpdatedAt ?? undefined,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};

export const getClients = async (): Promise<Client[]> => {
  ensureSeed();
  return readList<Client>(CLIENTS_KEY, [])
    .map((client) => normalizeClient(client))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const listClients = async (): Promise<Client[]> => getClients();

export const getClientById = async (id: string): Promise<Client | null> => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const match = clients.find((client) => client.id === id);
  return match ? normalizeClient(match) : null;
};

export const upsertClient = async (client: Client): Promise<Client> => {
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

export const deleteClient = async (id: string): Promise<void> => {
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

const INVITE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateInviteToken = (length: number) => {
  const size = Math.max(10, Math.min(16, length));
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(size);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join(
      ""
    );
  }
  let token = "";
  for (let i = 0; i < size; i += 1) {
    token += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return token;
};

const updateClientInvite = (clientId: string, token: string) => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const now = new Date().toISOString();
  const nextClients = clients.map((client) =>
    client.id === clientId
      ? {
          ...client,
          inviteToken: token,
          inviteUpdatedAt: now,
          updatedAt: now,
        }
      : client
  );
  writeList(CLIENTS_KEY, nextClients);
  return { token, updatedAt: now };
};

export const ensureClientInviteToken = async (clientId: string) => {
  ensureSeed();
  const clients = readList<Client>(CLIENTS_KEY, []);
  const match = clients.find((client) => client.id === clientId);
  if (match?.inviteToken && match.inviteUpdatedAt) {
    return { token: match.inviteToken, updatedAt: match.inviteUpdatedAt };
  }
  const token = generateInviteToken(12);
  return updateClientInvite(clientId, token);
};

export const regenerateClientInviteToken = async (clientId: string) => {
  const token = generateInviteToken(12);
  return updateClientInvite(clientId, token);
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
      raw.durationMin ??
      (raw as { durationMinutes?: number }).durationMinutes ??
      60,
    status: normalizeStatus(raw.status),
    notes: raw.notes,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};

export const getAppointments = async (): Promise<Appointment[]> => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  return appointments
    .map((appointment) => normalizeAppointment(appointment))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
};

export const getAppointmentById = async (
  id: string
): Promise<Appointment | null> => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const match = appointments.find((appointment) => appointment.id === id);
  return match ? normalizeAppointment(match) : null;
};

export const upsertAppointment = async (
  appointment: Appointment
): Promise<Appointment> => {
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

export const deleteAppointment = async (id: string): Promise<void> => {
  ensureSeed();
  const appointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  writeList(
    APPOINTMENTS_KEY,
    appointments.filter((appointment) => appointment.id !== id)
  );
};

export const listAppointments = async (): Promise<Appointment[]> =>
  getAppointments();

const normalizeServiceType = (value: string | undefined): FormulaServiceType => {
  if (
    value === "color" ||
    value === "lighten" ||
    value === "tone" ||
    value === "gloss"
  ) {
    return value;
  }
  return "other";
};

const normalizeStep = (step: Partial<FormulaStep>, index: number): FormulaStep => {
  return {
    stepName: step.stepName?.trim() || `Step ${index + 1}`,
    product: step.product?.trim() || "",
    developer: step.developer?.trim() || undefined,
    ratio: step.ratio?.trim() || undefined,
    grams: step.grams ?? undefined,
    processingMin: step.processingMin ?? undefined,
    notes: step.notes?.trim() || undefined,
  };
};

const normalizeFormula = (raw: Partial<Formula>): Formula => {
  const now = new Date().toISOString();
  const legacy = raw as {
    clientName?: string;
    service?: string;
    developer?: string;
    ratio?: string;
    grams?: number;
    processingTime?: string;
  };
  const legacyProcessing = legacy.processingTime
    ? Number.parseInt(legacy.processingTime, 10)
    : undefined;
  const safeLegacyProcessing = Number.isNaN(legacyProcessing)
    ? undefined
    : legacyProcessing;
  const baseStep: FormulaStep = {
    stepName: "Formula",
    product: legacy.service ?? raw.title ?? "",
    developer: legacy.developer,
    ratio: legacy.ratio,
    grams: legacy.grams,
    processingMin: safeLegacyProcessing,
    notes: raw.notes,
  };

  const steps = Array.isArray(raw.steps) && raw.steps.length > 0
    ? raw.steps.map((step, index) => normalizeStep(step, index))
    : [normalizeStep(baseStep, 0)];

  return {
    id: raw.id ?? createId(),
    clientId: raw.clientId ?? "",
    serviceType: normalizeServiceType(raw.serviceType),
    title: raw.title ?? legacy.service ?? "Untitled formula",
    colorLine: raw.colorLine ?? undefined,
    steps,
    appointmentId: raw.appointmentId ?? undefined,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};

export const getFormulas = async (): Promise<Formula[]> => {
  ensureSeed();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  return formulas
    .map((formula) => normalizeFormula(formula))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const getFormulaById = async (id: string): Promise<Formula | null> => {
  ensureSeed();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  const match = formulas.find((formula) => formula.id === id);
  return match ? normalizeFormula(match) : null;
};

export const upsertFormula = async (formula: Formula): Promise<Formula> => {
  ensureSeed();
  const now = new Date().toISOString();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  const exists = formulas.some((item) => item.id === formula.id);
  const nextFormula = normalizeFormula({
    ...formula,
    id: formula.id || createId(),
    title: formula.title.trim(),
    colorLine: formula.colorLine?.trim() || undefined,
    appointmentId: formula.appointmentId || undefined,
    createdAt: exists ? formula.createdAt : now,
    updatedAt: now,
  });

  const nextFormulas = exists
    ? formulas.map((item) => (item.id === nextFormula.id ? nextFormula : item))
    : [...formulas, nextFormula];

  writeList(FORMULAS_KEY, nextFormulas);
  return nextFormula;
};

export const deleteFormula = async (id: string): Promise<void> => {
  ensureSeed();
  const formulas = readList<Formula>(FORMULAS_KEY, []);
  writeList(
    FORMULAS_KEY,
    formulas.filter((formula) => formula.id !== id)
  );
};

export const listFormulas = async (): Promise<Formula[]> => getFormulas();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBackupV1 = (value: unknown): value is OpelleBackupV1 => {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    Array.isArray(value.clients) &&
    Array.isArray(value.appointments) &&
    Array.isArray(value.formulas)
  );
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

export const importBackup = async (
  data: unknown,
  opts?: { merge?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!isBackupV1(data)) {
    return { ok: false, error: "Invalid backup file." };
  }

  const merge = Boolean(opts?.merge);
  const now = new Date().toISOString();
  const incomingClients = data.clients.map((client) => normalizeClient(client));
  const incomingAppointments = data.appointments.map((appointment) =>
    normalizeAppointment(appointment)
  );
  const incomingFormulas = data.formulas.map((formula) =>
    normalizeFormula(formula)
  );

  if (!merge) {
    writeList(CLIENTS_KEY, incomingClients);
    writeList(APPOINTMENTS_KEY, incomingAppointments);
    writeList(FORMULAS_KEY, incomingFormulas);
    return { ok: true };
  }

  const existingClients = readList<Client>(CLIENTS_KEY, []);
  const existingAppointments = readList<Appointment>(APPOINTMENTS_KEY, []);
  const existingFormulas = readList<Formula>(FORMULAS_KEY, []);

  const mergeById = <T extends { id: string; updatedAt: string }>(
    existing: T[],
    incoming: T[]
  ) => {
    const map = new Map(existing.map((item) => [item.id, item]));
    incoming.forEach((item) => {
      map.set(item.id, { ...item, updatedAt: now });
    });
    return Array.from(map.values());
  };

  writeList(CLIENTS_KEY, mergeById(existingClients, incomingClients));
  writeList(
    APPOINTMENTS_KEY,
    mergeById(existingAppointments, incomingAppointments)
  );
  writeList(FORMULAS_KEY, mergeById(existingFormulas, incomingFormulas));

  return { ok: true };
};

export const resetAll = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLIENTS_KEY);
  window.localStorage.removeItem(APPOINTMENTS_KEY);
  window.localStorage.removeItem(FORMULAS_KEY);
};
