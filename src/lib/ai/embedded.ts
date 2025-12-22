import type {
  AiInput,
  AiResult,
  AiTask,
  AftercareDraftPayload,
  IntakeSummaryPayload,
  NextActionsPayload,
  ServiceLogSummaryPayload,
} from "@/lib/ai/types";

const createdAt = "2025-01-01T00:00:00.000Z";

export const runEmbeddedTask = (task: AiTask, input: AiInput = {}): AiResult => {
  const clientName = input.clientName ?? "Sample Client";
  const service = input.service ?? "Signature Service";
  const notes = input.notes ?? "No additional notes provided.";

  if (task === "next_actions") {
    const data: NextActionsPayload = {
      items: [
        {
          title: `Send ${clientName} the ${service} aftercare plan`,
          dueInDays: 1,
          owner: "Practitioner",
        },
        {
          title: `Schedule a follow-up check-in for ${clientName}`,
          dueInDays: 7,
          owner: "Front Desk",
        },
        {
          title: `Log service notes: ${notes}`,
          dueInDays: 0,
          owner: "Practitioner",
        },
      ],
    };
    return { task, createdAt, data };
  }

  if (task === "aftercare_draft") {
    const data: AftercareDraftPayload = {
      subject: `${clientName} — ${service} aftercare plan`,
      body:
        "Hydrate, avoid heat exposure for 24 hours, and apply the barrier serum nightly.",
      highlights: [
        "Use a gentle cleanser for 3 days",
        "Avoid actives until day 4",
        "SPF 30+ daily",
      ],
    };
    return { task, createdAt, data };
  }

  if (task === "intake_summary") {
    const data: IntakeSummaryPayload = {
      overview: `${clientName} is focused on hydration, sensitivity relief, and long-term glow.`,
      concerns: ["Dryness", "Redness", "Barrier fatigue"],
      preferences: ["Low fragrance", "Evening appointments"],
    };
    return { task, createdAt, data };
  }

  const data: ServiceLogSummaryPayload = {
    summary: `${service} completed. Skin responded well with minor sensitivity noted.`,
    followUps: [
      "Check-in after 48 hours",
      "Recommend hydrating mask in two days",
    ],
    riskFlags: ["Sensitive areas observed"],
  };

  return { task: "service_log_summary", createdAt, data };
};
