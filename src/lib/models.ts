export type Client = {
  id: string;
  firstName: string;
  lastName?: string;
  pronouns?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const getClientDisplayName = (client: Client) => {
  return client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.firstName;
};

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  clientId: string;
  serviceName: string;
  startAt: string;
  durationMin: number;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type FormulaServiceType = "color" | "lighten" | "tone" | "gloss" | "other";

export type FormulaStep = {
  stepName: string;
  product: string;
  developer?: string;
  ratio?: string;
  grams?: number;
  processingMin?: number;
  notes?: string;
};

export type Formula = {
  id: string;
  clientId: string;
  serviceType: FormulaServiceType;
  title: string;
  colorLine?: string;
  steps: FormulaStep[];
  appointmentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpelleBackupV1 = {
  version: 1;
  exportedAt: string;
  clients: Client[];
  appointments: Appointment[];
  formulas: Formula[];
};
