import type { Appointment, Client, Formula } from "@/lib/models";

export type StorageState = {
  clients: Client[];
  appointments: Appointment[];
  formulas: Formula[];
};

export const getMockSeed = (): StorageState => {
  const now = new Date();
  const nowIso = now.toISOString();

  return {
    clients: [
      {
        id: "client_avery",
        firstName: "Avery",
        lastName: "Chen",
        pronouns: "she/her",
        phone: "(415) 555-0188",
        email: "avery@example.com",
        notes: "Hydration focus; sensitive to fragrance.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "client_maya",
        firstName: "Maya",
        lastName: "Torres",
        pronouns: "they/them",
        phone: "(415) 555-0122",
        email: "maya@example.com",
        notes: "Prefers evening appointments.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    appointments: [
      {
        id: "appt_1",
        clientId: "client_avery",
        clientName: "Avery Chen",
        service: "Signature Glow Facial",
        startAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        status: "scheduled",
        notes: "Focus on hydration and barrier repair.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "appt_2",
        clientId: "client_maya",
        clientName: "Maya Torres",
        service: "Calming Treatment",
        startAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
        status: "completed",
        notes: "Recommend gentle cleanser follow-up.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    formulas: [
      {
        id: "formula_1",
        clientName: "Avery Chen",
        service: "Signature Glow Facial",
        colorLine: "Opelle Radiance",
        grams: 35,
        developer: "10 vol",
        processingTime: "12 min",
        notes: "Added barrier booster ampoule.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
  };
};
