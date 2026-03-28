# Kernel Endpoints Needed — Inspo Analysis

**Date:** 2026-03-28
**From:** Opelle App
**To:** Dominus Foundry / Kernel Team
**Priority:** High — 4 client-facing features are blocked

---

## Background

The Opelle app had a code violation where 4 AI functions in `src/lib/ai/inspo-analysis.ts` were calling the Anthropic SDK directly, bypassing the kernel entirely. This has been corrected — all AI now routes through `kernelPost()` to `opelle.dominusfoundry.com` as required.

However, the kernel does not currently have handlers for these 4 endpoints. Until they are added, the inspo-related features will not work.

---

## Endpoints That Already Work

These kernel endpoints are live and functioning correctly:

| Endpoint | Used For |
|---|---|
| `POST /api/v1/ai/chat` | Metis AI copilot chat |
| `POST /api/v1/ai/client-profile` | Client preference profiles |
| `POST /api/v1/ai/suggest-formula` | Formula suggestion from history |
| `POST /api/v1/ai/product-enrichment` | Product data enrichment |
| `POST /api/v1/ai/rebook-message` | Rebook outreach messages |
| `POST /api/v1/ai/inventory-predictions` | Inventory forecasting |
| `POST /api/v1/ai/parse-formula` | Formula note parsing |
| `POST /api/v1/ai/suggestions` | Metis contextual suggestions |
| `POST /api/v1/ai/distill-lessons` | Feedback → lesson distillation |
| `POST /api/v1/ai/analyze-inspo` | Inspo analysis (exists but may differ from vision variant) |

---

## 4 Endpoints Needed

### 1. `POST /api/v1/ai/analyze-inspo-vision`

**What it does:** Accepts client inspo photos (base64 images) with category metadata and returns follow-up consultation questions + a client-facing summary. This is a **vision model** call — it needs to process images.

**Request body:**
```json
{
  "images": [
    { "mediaType": "image/jpeg", "base64": "<base64 string>" }
  ],
  "category_meta": [
    { "category": "color_tone", "photoIndices": [0] },
    { "category": "cut_shape", "photoIndices": [1] }
  ],
  "client_notes": "I want something warmer for summer",
  "client_context": {
    "firstName": "Sarah",
    "colorDirection": "warm blonde",
    "maintenanceLevel": "low",
    "styleNotes": "fine hair, air dries",
    "processingPreferences": "no bleach"
  },
  "formula_history": "2024-01-15: Bowl 1: 7N + 20vol..."
}
```

**Expected response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "How would you describe your current hair?",
      "type": "multiple_choice",
      "options": ["Straight and short", "Wavy and medium", "..."],
      "photoIndex": 0
    }
  ],
  "clientSummary": "It looks like you're drawn to a warm, dimensional blonde..."
}
```

**Model requirement:** Must support vision (image inputs). Claude Sonnet 4 recommended.
**Timeout:** 60 seconds (vision analysis is slow with multiple images).

**Features blocked:** Client inspo photo upload and consultation flow.

---

### 2. `POST /api/v1/ai/stylist-intelligence`

**What it does:** Takes the client's Q&A answers from the inspo consultation and generates a stylist-facing intelligence brief.

**Request body:**
```json
{
  "questions": [
    { "id": "q1", "question": "How would you describe your current hair?", "type": "multiple_choice", "options": ["..."] }
  ],
  "answers": { "q1": "Wavy and medium (shoulders to mid-back)" },
  "client_summary": "AI's initial read of their photos...",
  "client_notes": "Client's own note about what they want",
  "client_context": {
    "firstName": "Sarah",
    "colorDirection": "warm blonde",
    "maintenanceLevel": "low",
    "styleNotes": "fine hair"
  },
  "formula_history": "Recent formula entries..."
}
```

**Expected response:**
```json
{
  "whatWasLearned": "Client is drawn to a cool-toned, lived-in blonde...",
  "appointmentPrep": "Prep lightener and toner. Expect 3-hour session...",
  "keyPreferences": ["Prefers cool undertones", "Washes 2x/week"],
  "potentialChallenges": ["Dark base may need multiple sessions"],
  "productSuggestions": ["Purple shampoo", "Bond repair treatment"]
}
```

**Timeout:** 30 seconds.

**Features blocked:** Stylist Intelligence brief shown on client inspo submissions.

---

### 3. `POST /api/v1/ai/appointment-flag`

**What it does:** Checks if a client's next booked appointment has enough time for what the inspo consultation suggests they want. Returns null if timing is fine, or a warning/critical flag if there's a mismatch.

**Request body:**
```json
{
  "intelligence_summary": "Client wants full balayage transformation...",
  "appointment_prep": "Expect 3+ hour session, prep lightener...",
  "potential_challenges": ["Dark base requires multiple passes"],
  "next_appointment": {
    "serviceName": "Highlight Touch-Up",
    "durationMins": 90,
    "startAt": "2026-04-05T10:00:00Z"
  }
}
```

**Expected response (mismatch):**
```json
{
  "severity": "critical",
  "message": "The client wants a full balayage transformation but only has 90 minutes booked for a touch-up. This will likely need 3+ hours. Consider rebooking as a full highlight appointment."
}
```

**Expected response (no issue):**
```json
null
```

**Timeout:** 15 seconds.

**Features blocked:** Appointment time mismatch warnings on inspo submissions.

---

### 4. `POST /api/v1/ai/inspo-formula-suggestion`

**What it does:** Generates an actionable starting-point formula for the stylist based on the client's inspo consultation data and formula history.

**Request body:**
```json
{
  "stylist_intelligence": {
    "whatWasLearned": "...",
    "appointmentPrep": "...",
    "keyPreferences": ["..."],
    "potentialChallenges": ["..."],
    "productSuggestions": ["..."]
  },
  "client_summary": "AI's initial read...",
  "formula_history": "Previous formula entries...",
  "client_context": {
    "firstName": "Sarah",
    "colorDirection": "warm blonde",
    "maintenanceLevel": "low",
    "styleNotes": "fine hair"
  },
  "questions": [{ "id": "q1", "question": "...", "type": "multiple_choice" }],
  "answers": { "q1": "..." }
}
```

**Expected response:**
```json
{
  "suggested_formula": "Bowl 1: Lightener + 20vol at 1:2, foils on mid-lengths and ends\nBowl 2: 8N + 10vol shadow root\nToner: 9V + clear at 1:1, 10 min\nApplication: Start with face-framing pieces\nNotes: Strand test recommended",
  "reasoning": "Based on client's current dark blonde base and desire for cool-toned dimension...",
  "confidence": 0.85,
  "caution": "Previous lightening history suggests careful developer choice"
}
```

**Timeout:** 30 seconds.

**Features blocked:** "Suggest Formula → From Inspo" button on the formula entry page.

---

## Auth

All requests include the header:
```
X-Kernel-Auth: <KERNEL_API_KEY>
```

The app sends this on every `kernelPost()` call. The key is already configured in Vercel environment variables.

---

## How to Verify

Once the endpoints are live, these features should start working immediately with no app-side changes needed:

1. **Inspo photo upload** — Client uploads photos → consultation questions appear
2. **Stylist Intelligence** — Client answers questions → stylist brief generates
3. **Appointment flag** — Brief auto-checks against booked appointment time
4. **From Inspo formula** — Stylist clicks "Suggest Formula → From Inspo" → formula appears

The app will automatically use these endpoints — the routing is already in place.
