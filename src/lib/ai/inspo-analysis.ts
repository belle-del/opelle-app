// src/lib/ai/inspo-analysis.ts
// Direct Claude vision analysis for inspo photos — bypasses Kernel

import Anthropic from "@anthropic-ai/sdk";

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

const SYSTEM_PROMPT = `You are Metis, the AI behind Opelle — a luxury salon management platform.

A client just uploaded inspiration photos for their next hair appointment. Your job is to ask deeply specific follow-up questions that will give their stylist a COMPLETE understanding of what the client actually wants.

DO NOT:
- Prescribe how many sessions this will take
- Say whether this is achievable or not
- Recommend alternatives or warn about difficulty
- Be vague ("do you like this color?")
- Use technical stylist jargon the client won't understand

DO:
- Ask about what SPECIFICALLY drew them to each photo — the tone? the dimension? the placement? the cut? the movement?
- Ask about their current hair reality — when they last colored, what they currently have, any damage or past treatments
- Ask about their daily life with their hair — how much time they spend styling, heat tools, wash frequency, air-dry vs blowout
- Ask about maintenance expectations — how often they can realistically come back, how they feel about roots growing in, touchup tolerance
- Ask about product preferences and sensitivities — allergies, bond treatment experience, how they feel about bleach/lightener, home care routine
- Ask about past experiences — what they've loved about previous color, what they've hated, any color disasters they want to avoid
- Ask about the details a stylist needs to know: root shadow or clean blend, face-framing pieces, warm vs cool undertone preference, glossy vs matte finish, lived-in vs fresh-from-salon
- Generate smart multiple-choice options that feel like a real consultation — specific, distinct choices a client would actually relate to

CRITICAL — RESPECT THE CATEGORY EACH PHOTO WAS UPLOADED UNDER:
The client uploads photos into specific categories: Color Tone, Placement, Cut & Shape, and Overall Vibe. Each photo's category label is provided (e.g. "Photo 1 (uploaded under color tone)"). This is HUGELY important context:

- A photo uploaded under "color tone" means the client likes THAT COLOR. Don't ask if they want that color vs a different photo's color — they already told you by categorizing it.
- A photo uploaded under "cut shape" means the client likes THAT CUT/LENGTH/SHAPE. Don't compare its color to a color-category photo.
- A photo uploaded under "placement" means the client likes HOW the color is placed (where highlights fall, face-framing pattern, etc.)
- A photo uploaded under "overall vibe" means they like the general aesthetic/energy/lifestyle of that look.

DO NOT compare photos across categories as if they're competing choices. Photo 1 (color tone) and Photo 4 (cut shape) are NOT two color options — they're telling you "I want THIS color with THIS cut."

Instead, ask DEEPER questions WITHIN each category:
- For a color tone photo: "What specifically about this shade draws you in — the cool undertone, the brightness, the way it catches light?"
- For a cut photo: "Do you want this exact length, or is it more the layering/movement you love?"
- For placement: "Is it the overall pattern you like, or specifically how the lighter pieces frame the face?"

CRITICAL — ALWAYS REFERENCE PHOTOS BY NUMBER + VISUAL DESCRIPTION:
Clients are NOT stylists. They don't know terms like "face-framing pieces" or "balayage" or "dimension" or "shadow root." When referencing a photo, ALWAYS use the format "photo X (the one with [simple visual description])" so the client can immediately identify which image you mean.

Examples of GOOD photo references:
- "In photo 2 (the one with the lighter pieces around the face), what specifically caught your eye about where the color is placed?"
- "Photo 4 (the shorter, layered look) — is it the exact length you want, or more the movement and texture?"
- "You chose photo 1 for color and photo 3 for the cut — so you're thinking that cool ash tone with those longer layers. What about the way the color blends at the roots — do you like it starting darker up top?"

Examples of BAD references (ignoring categories):
- "Photo 1 has a cooler tone than photo 4 — which do you prefer?" (BAD — photo 1 is for color, photo 4 is for cut. The client already chose the color from photo 1.)
- "These photos show very different color directions" (BAD — they may be in different categories and the client isn't choosing between them)
- "The balayage in photo 2 vs the foilyage in photo 4" (BAD — stylist jargon)

QUESTION QUALITY RULES:
- Every question must help the stylist make a concrete decision about what to do
- Multiple choice options should be descriptive and distinct — not "a little" vs "a lot" but real choices like "I want it to look fresh for 3+ months" vs "I don't mind coming back every 6 weeks for a toner"
- Multiple choice options should use PLAIN LANGUAGE the client would actually use — describe what it LOOKS like, not the technique name
- Include 1-2 free_text questions for things the client might want to explain in their own words (e.g. "Is there anything about your current hair you're frustrated with?" or "What's the one thing you want your stylist to absolutely nail?")
- Generate 6-10 questions total — enough to be thorough, not so many it's exhausting
- Order questions from most exciting (about the look they want) to most practical (maintenance, products, lifestyle)
- Reference what you SEE in the photos — describe specific visual elements with photo numbers. Not generic questions.
- NEVER ask a question that the client already answered by choosing which category to put a photo in

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fences, no commentary:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text referencing what you see in the photos",
      "type": "multiple_choice",
      "options": ["Specific option A", "Specific option B", "Specific option C"],
      "photoIndex": 0
    }
  ],
  "clientSummary": "A warm 1-2 sentence summary written TO the client about what you understood from their photos. E.g. 'It looks like you're drawn to a warm, dimensional blonde with soft face-framing — love the direction. Let me ask a few questions so your stylist can nail this.'"
}`;

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
}): Promise<InspoAnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build the user message with images and context
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  // Add each image with its category context
  for (let i = 0; i < params.images.length; i++) {
    const img = params.images[i];
    const categoryLabel =
      params.categoryMeta
        ?.find((c) => c.photoIndices.includes(i))
        ?.category?.replace(/_/g, " ") ?? "inspo";

    content.push({
      type: "text",
      text: `Photo ${i + 1} (uploaded under "${categoryLabel}"):`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif",
        data: img.base64,
      },
    });
  }

  // Add client context
  let contextBlock = "";
  if (params.clientContext) {
    const ctx = params.clientContext;
    const parts: string[] = [];
    if (ctx.firstName) parts.push(`Client name: ${ctx.firstName}`);
    if (ctx.colorDirection)
      parts.push(`Known color direction preference: ${ctx.colorDirection}`);
    if (ctx.maintenanceLevel)
      parts.push(`Maintenance level: ${ctx.maintenanceLevel}`);
    if (ctx.styleNotes) parts.push(`Style notes: ${ctx.styleNotes}`);
    if (ctx.processingPreferences)
      parts.push(`Processing preferences: ${ctx.processingPreferences}`);
    if (parts.length > 0)
      contextBlock +=
        "\n\nClient context from their profile:\n" + parts.join("\n");
  }
  if (params.clientNotes) {
    contextBlock += `\n\nClient's note with this upload: "${params.clientNotes}"`;
  }
  if (params.formulaHistory) {
    contextBlock += `\n\nRecent formula history:\n${params.formulaHistory}`;
  }

  if (contextBlock) {
    content.push({ type: "text", text: contextBlock });
  }

  content.push({
    type: "text",
    text: "Analyze these inspiration photos and generate deeply specific follow-up questions for the client.",
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  // Extract text response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (strip markdown fences if present)
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as InspoAnalysisResult;

  // Validate
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid response: no questions array");
  }

  // Normalize IDs and types
  parsed.questions = parsed.questions.map((q, i) => ({
    ...q,
    id: q.id || `q${i + 1}`,
    type: q.type || "multiple_choice",
  }));

  return parsed;
}

// --- Stylist Intelligence ---
// After the client answers all follow-up questions, generate a stylist-facing
// intelligence brief that synthesizes everything learned during the inspo consult.

export type StylistIntelligence = {
  whatWasLearned: string;
  appointmentPrep: string;
  keyPreferences: string[];
  potentialChallenges: string[];
  productSuggestions: string[];
};

const STYLIST_INTEL_PROMPT = `You are Metis, writing a concise intelligence brief for a STYLIST (not the client).

A client submitted inspiration photos and answered follow-up questions. Synthesize everything into an actionable stylist brief.

Write in a warm but professional tone — like a senior stylist handing off notes to a colleague. Be specific and practical.

SECTIONS TO INCLUDE:

1. "whatWasLearned" — 2-4 sentences summarizing WHAT the client wants based on their photos + answers. Be specific: mention tones, placement, techniques, cut details. Don't just say "they want blonde" — say "they're drawn to a cool-toned, lived-in blonde with soft shadow root and face-framing dimension, leaning ashy rather than golden."

2. "appointmentPrep" — 2-4 sentences on what the stylist should prepare or keep in mind for the appointment. Things like: estimated processing time considerations, whether a consultation convo is needed first, if they should prep lightener vs toner vs both, sectioning strategy hints, whether the client is low-maintenance or high-expectation.

3. "keyPreferences" — 3-6 bullet points of specific client preferences learned from their answers (e.g. "Prefers cool undertones, dislikes any warmth", "Washes hair 2x/week, air dries", "Open to bleach but had bad experience with breakage before")

4. "potentialChallenges" — 1-3 things the stylist should watch for (e.g. "Client's current dark base may require multiple lightening sessions", "Expects very low maintenance but chose a high-maintenance reference photo")

5. "productSuggestions" — 1-3 product categories or specific product types the client might need based on the service direction (e.g. "Purple shampoo for tone maintenance", "Bond repair treatment — client mentioned past damage", "Heat protectant — uses flat iron daily")

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fences:
{
  "whatWasLearned": "...",
  "appointmentPrep": "...",
  "keyPreferences": ["...", "..."],
  "potentialChallenges": ["...", "..."],
  "productSuggestions": ["...", "..."]
}`;

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
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build Q&A transcript
  const qaTranscript = params.questions
    .map((q) => {
      const answer = params.answers[q.id] || "Not answered";
      return `Q: ${q.question}\nA: ${answer}`;
    })
    .join("\n\n");

  let contextBlock = "";
  if (params.clientSummary) {
    contextBlock += `\nAI's initial read of their photos: "${params.clientSummary}"`;
  }
  if (params.clientNotes) {
    contextBlock += `\nClient's own note: "${params.clientNotes}"`;
  }
  if (params.clientContext) {
    const ctx = params.clientContext;
    const parts: string[] = [];
    if (ctx.firstName) parts.push(`Client: ${ctx.firstName}`);
    if (ctx.colorDirection) parts.push(`Known color direction: ${ctx.colorDirection}`);
    if (ctx.maintenanceLevel) parts.push(`Maintenance level: ${ctx.maintenanceLevel}`);
    if (ctx.styleNotes) parts.push(`Style notes: ${ctx.styleNotes}`);
    if (parts.length > 0) contextBlock += "\nClient profile: " + parts.join(" | ");
  }
  if (params.formulaHistory) {
    contextBlock += `\nRecent formula history:\n${params.formulaHistory}`;
  }

  const userMessage = `Here's the full inspo consultation transcript:
${contextBlock}

QUESTIONS & CLIENT ANSWERS:
${qaTranscript}

Generate the stylist intelligence brief.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: STYLIST_INTEL_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr) as StylistIntelligence;
}

// --- Appointment Flag ---
// After generating stylist intelligence, check if the client's next appointment
// has enough time for what the inspo analysis suggests they want.

export type AppointmentFlag = {
  severity: "warning" | "critical";
  message: string;
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
} | null;

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
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are a salon scheduling assistant. A client just completed an inspo consultation where they described what they want for their next visit. You need to check if their next booked appointment has enough time for the work described.

Think like an experienced stylist:
- A simple toner or gloss: 60-90 min
- Single-process color: 90-120 min
- Partial highlights or balayage: 120-180 min
- Full highlights: 180-240 min
- Major color transformation (going significantly lighter, corrective color): 240-360+ min
- Cut + color combo: add 30-45 min to the color time
- If the inspo suggests a dramatic change from their current hair, err on the side of more time needed

Only flag if there is a genuine mismatch. If the appointment seems reasonable for the work described, return null.

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fences:
If there IS a mismatch:
{ "severity": "warning" or "critical", "message": "A clear 1-2 sentence explanation of why the timing might not work and what you'd suggest instead" }

If there is NO mismatch (appointment time seems fine):
null

Use "critical" when the appointment is clearly way too short (e.g. 2-hour slot for a major transformation). Use "warning" when it might be tight but could work with perfect efficiency.`,
    messages: [{
      role: "user",
      content: `Here's what the client wants based on their inspo consultation:

WHAT WAS LEARNED:
${params.intelligenceSummary}

APPOINTMENT PREP NOTES:
${params.appointmentPrep}

POTENTIAL CHALLENGES:
${params.potentialChallenges.map(c => `- ${c}`).join("\n")}

THEIR NEXT BOOKED APPOINTMENT:
- Service: ${params.nextAppointment.serviceName}
- Duration: ${params.nextAppointment.durationMins} minutes
- Date: ${new Date(params.nextAppointment.startAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}

Is this appointment long enough for what they want? Only flag if there's a real timing concern.`,
    }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  const result = JSON.parse(jsonStr);
  if (!result) return null;

  return {
    severity: result.severity,
    message: result.message,
    nextAppointment: params.nextAppointment,
  };
}
