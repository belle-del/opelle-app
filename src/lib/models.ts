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
