# Inspo AI Deep Understanding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the inspo upload flow generate thorough AI questions that give the stylist a deep understanding of the client's desires — bypassing the broken Kernel endpoint and calling Claude directly.

**Architecture:** Install `@anthropic-ai/sdk`, build a `analyzeInspoDirect()` function in a new `src/lib/ai/inspo-analysis.ts` that calls Claude's vision API with a carefully crafted prompt. Rewire the POST `/api/client/inspo` route to use this instead of the Kernel. Simplify the flow: remove feasibility/demand-signals gating, always generate questions.

**Tech Stack:** Anthropic Claude API (claude-sonnet-4-20250514 with vision), Next.js API routes, existing Supabase storage

---

### Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the SDK**

Run: `npm install @anthropic-ai/sdk`

**Step 2: Verify installation**

Run: `npm ls @anthropic-ai/sdk`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk for direct Claude vision calls"
```

---

### Task 2: Build direct Claude inspo analysis function

**Files:**
- Create: `src/lib/ai/inspo-analysis.ts`

**Step 1: Create the analysis module**

```typescript
// src/lib/ai/inspo-analysis.ts
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
- Recommend alternatives
- Be vague ("do you like this color?")

DO:
- Ask about what SPECIFICALLY drew them to each photo (the tone? the dimension? the placement? the cut?)
- Ask about their current hair reality (when they last colored, what they currently have, damage history)
- Ask about their daily life with their hair (styling time, heat tools, wash frequency)
- Ask about maintenance expectations (how often can they come back, how do they feel about roots growing in)
- Ask about product preferences and sensitivities (allergies, preferences on ammonia/bleach, bond treatments)
- Ask about past experiences (what they've loved, what they've hated, any color disasters)
- Ask about specifics the stylist needs: root shadow vs. no root, face-framing vs. all-over, warm vs. cool, matte vs. glossy
- Generate smart multiple-choice options that reflect real possibilities — a stylist would recognize these as thoughtful

QUESTION QUALITY RULES:
- Every question must help the stylist make a concrete decision (which formula, which technique, which product)
- Multiple choice options should be specific and distinct — not "a little" vs "a lot" but real descriptive choices
- Include 1-2 free_text questions for things the client might want to explain in their own words
- Generate 6-10 questions total — enough to be thorough, not so many it's exhausting
- Order questions from most exciting (about the look they want) to most practical (maintenance, products)
- Reference what you SEE in the photos — "The balayage in your second photo has very fine, blended pieces..." not generic questions

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text referencing what you see",
      "type": "multiple_choice",
      "options": ["Option A - specific", "Option B - specific", "Option C - specific"],
      "photoIndex": 0
    }
  ],
  "clientSummary": "A warm 1-2 sentence summary of what the AI understood from the photos, written TO the client. E.g. 'It looks like you're drawn to a warm, lived-in blonde with soft face-framing. Let's nail down the details.'"
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
  const anthropic = new Anthropic();

  // Build the user message with images and context
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  // Add each image
  for (let i = 0; i < params.images.length; i++) {
    const img = params.images[i];
    const categoryLabel = params.categoryMeta
      ?.find((c) => c.photoIndices.includes(i))
      ?.category?.replace("_", " ") ?? "inspo";

    content.push({
      type: "text",
      text: `Photo ${i + 1} (uploaded under "${categoryLabel}"):`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
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
    if (ctx.colorDirection) parts.push(`Known color direction preference: ${ctx.colorDirection}`);
    if (ctx.maintenanceLevel) parts.push(`Maintenance level: ${ctx.maintenanceLevel}`);
    if (ctx.styleNotes) parts.push(`Style notes: ${ctx.styleNotes}`);
    if (ctx.processingPreferences) parts.push(`Processing preferences: ${ctx.processingPreferences}`);
    if (parts.length > 0) contextBlock += "\n\nClient context from their profile:\n" + parts.join("\n");
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
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as InspoAnalysisResult;

  // Validate and assign IDs if missing
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid response: no questions array");
  }

  parsed.questions = parsed.questions.map((q, i) => ({
    ...q,
    id: q.id || `q${i + 1}`,
    type: q.type || "multiple_choice",
  }));

  return parsed;
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/inspo-analysis.ts
git commit -m "feat: add direct Claude vision analysis for inspo photos"
```

---

### Task 3: Rewire the POST /api/client/inspo route

**Files:**
- Modify: `src/app/api/client/inspo/route.ts`

**Changes:**
1. Import `analyzeInspoDirect` instead of kernel's `analyzeInspo`
2. Pass category metadata to the analysis
3. Remove feasibility/demand-signals/task-creation logic
4. Always return questions from the direct analysis
5. Store the questions in `ai_analysis` on the submission row
6. Return questions in the response so `InspoUploader` can show them immediately

**Step 1: Rewrite the POST handler**

Replace the entire POST function. Key changes:
- Line 5: Import from `@/lib/ai/inspo-analysis` instead of kernel
- Lines 162-276: Replace the entire Kernel analysis block + feasibility + demand signals + task creation with a single `analyzeInspoDirect()` call
- The response now always includes `aiAnalysis.generatedFormQuestions` from the direct analysis
- On failure: return `aiAnalysisFailed: true` but with a real error message

**Step 2: Commit**

```bash
git add src/app/api/client/inspo/route.ts
git commit -m "feat: use direct Claude analysis instead of Kernel for inspo"
```

---

### Task 4: Simplify InspoUploader flow

**Files:**
- Modify: `src/app/client/(portal)/inspo/_components/InspoUploader.tsx`

**Changes:**
1. The `SubmissionResult` type should expect `generatedFormQuestions` at the top level of the API response (not nested under `perPhotoQuestions`)
2. The `hasQuestions` check on line 182-184 should always route to `InspoFollowUp` when questions exist
3. The analyzing spinner should show a better message
4. If AI fails, show a retry button instead of silently falling back

**Step 1: Update the submit handler and types**

**Step 2: Commit**

```bash
git add src/app/client/(portal)/inspo/_components/InspoUploader.tsx
git commit -m "feat: always show AI questions after inspo upload"
```

---

### Task 5: Simplify InspoSubmissionsList (remove feasibility labels)

**Files:**
- Modify: `src/app/client/(portal)/inspo/_components/InspoSubmissionsList.tsx`

**Changes:**
1. Remove `getFeasibilityLabel()` function and its display
2. Simplify status badges — just "Submitted" vs "Reviewed"
3. Remove consult form link gating (no longer conditional on `requires_consult`)

**Step 1: Clean up the component**

**Step 2: Commit**

```bash
git add src/app/client/(portal)/inspo/_components/InspoSubmissionsList.tsx
git commit -m "refactor: simplify inspo submissions list, remove feasibility labels"
```

---

### Task 6: Verify images display on practitioner side

**Files:**
- No code changes needed (bucket is now public)

**Step 1: Verify by testing**
- Upload an inspo from client side
- Check practitioner side inspo tab
- Confirm images load (no more blue ? icons)

**Step 2: If images still broken, check storage path matching**
- The upload path uses `photo_${i}.${ext}` where ext comes from filename
- The list uses `admin.storage.from("client-inspo").list(path)`
- Make sure `.emptyFolderPlaceholder` files are filtered out

---

### Task 7: End-to-end test and deploy

**Step 1: Restart dev server and test full flow**
- Upload 1-3 photos as client
- Verify analyzing spinner appears
- Verify AI questions appear (6-10 questions with smart options)
- Answer all questions
- Verify "All done" screen
- Check practitioner side — images visible, answers visible

**Step 2: Build check**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 3: Commit any final fixes**

**Step 4: Push to deploy**

```bash
git push
```
