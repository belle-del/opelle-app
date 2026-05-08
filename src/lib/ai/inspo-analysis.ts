// src/lib/ai/inspo-analysis.ts
// All AI calls routed through the Kernel — no direct SDK usage.

import {
  analyzeInspoVision,
  generateStylistIntel,
  generateApptFlag,
  generateInspoFormula,
} from "@/lib/kernel";

// ── Types (re-exported for consumers) ───────────────────────

export type InspoQuestion = {
  id: string;
  question: string;
  type: "multiple_choice" | "yes_no" | "free_text" | "scale";
  options?: string[];
  photoIndex?: number;
};

export type InspoAnalysisResult = {
  questions: InspoQuestion[];
  clientSummary: string;
};

export type StylistIntelligence = {
  whatWasLearned: string;
  appointmentPrep: string;
  keyPreferences: string[];
  potentialChallenges: string[];
  productSuggestions: string[];
};

export type AppointmentFlag = {
  severity: "warning" | "critical";
  message: string;
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
} | null;

export type InspoFormulaSuggestion = {
  suggested_formula: string;
  reasoning: string;
  confidence: number;
  caution?: string;
  based_on: "inspo";
};

// ── 1. Analyze inspo photos (vision) ─────────────────────────

export async function analyzeInspoDirect(params: {
  images: { mediaType: string; base64: string }[];
  categoryMeta?: { category: string; photoIndices: number[] }[];
  clientNotes: string | null;
  clientContext: {
    firstName?: string;
    lastName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
    processingPreferences?: string;
  } | null;
  formulaHistory: string | null;
  availableServices?: string[];
}): Promise<InspoAnalysisResult> {
  // Inject the services list into clientNotes as well so the existing kernel
  // prompt sees them even before it formally consumes `available_services`.
  // Once the kernel's prompt explicitly reads the new field this duplication
  // can be removed.
  let augmentedNotes = params.clientNotes;
  if (params.availableServices && params.availableServices.length > 0) {
    const servicesLine = `Services this stylist offers: ${params.availableServices.join(", ")}. When the inspo implies a transformation (e.g. more length, dramatic color, different texture), consider whether one of these services is a relevant path and ask the client about it.`;
    augmentedNotes = augmentedNotes ? `${augmentedNotes}\n\n${servicesLine}` : servicesLine;
  }

  const result = await analyzeInspoVision({
    images: params.images,
    categoryMeta: params.categoryMeta,
    clientNotes: augmentedNotes,
    clientContext: params.clientContext,
    formulaHistory: params.formulaHistory,
    availableServices: params.availableServices,
  });

  if (!result || !result.questions) {
    throw new Error("Kernel returned no analysis — ensure the kernel has the /api/v1/ai/analyze-inspo-vision endpoint");
  }

  result.questions = result.questions.map((q, i) => ({
    ...q,
    id: q.id || `q${i + 1}`,
    type: q.type || "multiple_choice",
  }));

  return result as InspoAnalysisResult;
}

// ── 2. Stylist intelligence brief ────────────────────────────

export async function generateStylistIntelligence(params: {
  questions: { id: string; question: string; type: string; options?: string[] }[];
  answers: Record<string, string>;
  clientSummary: string | null;
  clientNotes: string | null;
  clientContext: {
    firstName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
  } | null;
  formulaHistory: string | null;
}): Promise<StylistIntelligence> {
  const result = await generateStylistIntel({
    questions: params.questions,
    answers: params.answers,
    clientSummary: params.clientSummary,
    clientNotes: params.clientNotes,
    clientContext: params.clientContext,
    formulaHistory: params.formulaHistory,
  });

  if (!result) {
    throw new Error("Kernel returned no intelligence — ensure the kernel has the /api/v1/ai/stylist-intelligence endpoint");
  }

  return result;
}

// ── 3. Appointment time flag ─────────────────────────────────

export async function generateAppointmentFlag(params: {
  intelligenceSummary: string;
  appointmentPrep: string;
  potentialChallenges: string[];
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
}): Promise<AppointmentFlag> {
  const result = await generateApptFlag({
    intelligenceSummary: params.intelligenceSummary,
    appointmentPrep: params.appointmentPrep,
    potentialChallenges: params.potentialChallenges,
    nextAppointment: params.nextAppointment,
  });

  if (!result) return null;

  return {
    severity: result.severity,
    message: result.message,
    nextAppointment: params.nextAppointment,
  };
}

// ── 4. Formula suggestion from inspo ─────────────────────────

export async function generateInspoFormulaSuggestion(params: {
  stylistIntelligence: StylistIntelligence;
  clientSummary: string | null;
  formulaHistory: string | null;
  clientContext: {
    firstName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
  } | null;
  questions?: { id: string; question: string; type: string; options?: string[] }[];
  answers?: Record<string, string>;
  productCatalog?: string[] | null;
}): Promise<InspoFormulaSuggestion> {
  const result = await generateInspoFormula({
    stylistIntelligence: params.stylistIntelligence,
    clientSummary: params.clientSummary,
    formulaHistory: params.formulaHistory,
    clientContext: params.clientContext,
    questions: params.questions,
    answers: params.answers,
    productCatalog: params.productCatalog,
  });

  if (!result) {
    throw new Error("Kernel returned no formula suggestion — ensure the kernel has the /api/v1/ai/inspo-formula-suggestion endpoint");
  }

  result.based_on = "inspo";
  return result;
}
