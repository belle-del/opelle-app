export type Client = {
  id: string;
  name: string;
  pronouns?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type AppointmentStatus = "scheduled" | "completed" | "canceled";

export type Appointment = {
  id: string;
  clientId?: string;
  clientName: string;
  service: string;
  startAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentInput = Omit<
  Appointment,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type Formula = {
  id: string;
  clientName: string;
  service: string;
  colorLine: string;
  grams: number;
  developer: string;
  processingTime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FormulaInput = Omit<Formula, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type StorageState = {
  version: number;
  clients: Client[];
  appointments: Appointment[];
  formulas: Formula[];
};
