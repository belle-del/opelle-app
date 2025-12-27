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
        serviceName: "Signature Glow Facial",
        startAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        durationMin: 60,
        status: "scheduled",
        notes: "Focus on hydration and barrier repair.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "appt_2",
        clientId: "client_maya",
        serviceName: "Calming Treatment",
        startAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        durationMin: 45,
        status: "completed",
        notes: "Recommend gentle cleanser follow-up.",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    formulas: [
      {
        id: "formula_1",
        clientId: "client_avery",
        serviceType: "gloss",
        title: "Root touch-up + gloss",
        colorLine: "Opelle Radiance",
        steps: [
          {
            stepName: "Roots",
            product: "7N + 7G",
            developer: "10 vol",
            ratio: "1:1",
            grams: 30,
            processingMin: 20,
            notes: "Apply to regrowth only.",
          },
          {
            stepName: "Gloss",
            product: "Clear + 8G",
            developer: "Processing solution",
            ratio: "1:1",
            grams: 25,
            processingMin: 10,
          },
        ],
        appointmentId: "appt_1",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
  };
};
