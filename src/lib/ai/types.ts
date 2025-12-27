export type AiTask =
  | "next_actions"
  | "aftercare_draft"
  | "intake_summary"
  | "service_log_summary";

export type AiInput = {
  clientName?: string;
  service?: string;
  notes?: string;
};

export type NextActionsPayload = {
  items: Array<{ title: string; dueInDays: number; owner: string }>;
};

export type AftercareDraftPayload = {
  subject: string;
  body: string;
  highlights: string[];
};

export type AftercareDraftInput = {
  clientName: string;
  serviceName: string;
  notes?: string;
};

export type AftercareDraftResult = {
  title: string;
  summary: string;
  do: string[];
  dont: string[];
  rebookRecommendation: string;
};

export type IntakeSummaryPayload = {
  overview: string;
  concerns: string[];
  preferences: string[];
};

export type ServiceLogSummaryPayload = {
  summary: string;
  followUps: string[];
  riskFlags: string[];
};

export type AiResult =
  | { task: "next_actions"; createdAt: string; data: NextActionsPayload }
  | { task: "aftercare_draft"; createdAt: string; data: AftercareDraftPayload }
  | { task: "intake_summary"; createdAt: string; data: IntakeSummaryPayload }
  | {
      task: "service_log_summary";
      createdAt: string;
      data: ServiceLogSummaryPayload;
    };
