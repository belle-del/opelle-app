import type {
  AiInput,
  AiResult,
  AiTask,
  AftercareDraftInput,
  AftercareDraftResult,
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

export const generateAftercareDraft = (
  input: AftercareDraftInput
): AftercareDraftResult => {
  const clientName = input.clientName.trim() || "Client";
  const serviceName = input.serviceName.trim() || "Signature Service";
  const notes = input.notes?.trim();
  const noteLine = notes ? `Note: ${notes}` : "Note: No additional notes.";

  return {
    title: `${clientName} — ${serviceName} Aftercare`,
    summary:
      "Prioritize hydration, gentle cleansing, and heat protection for the first 48 hours.",
    do: [
      "Use a sulfate-free cleanser for the next two washes.",
      "Apply a lightweight leave-in or serum on damp hair.",
      "Protect with SPF/heat shield before styling.",
      noteLine,
    ],
    dont: [
      "Avoid heavy oils or waxes for 24 hours.",
      "Skip high-heat tools without protection.",
      "Do not over-wash in the first 48 hours.",
    ],
    rebookRecommendation: "Plan your next visit in 6-8 weeks.",
  };
};
