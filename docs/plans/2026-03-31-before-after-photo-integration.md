# Before/After Photo Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire `BeforeAfterCapture` into `CheckoutFlow` and `ProgressDashboard` so chemical services require before/after photos before completion can be submitted.

**Architecture:** Option A — inline reveal. `requires_photos` flag travels with the existing categories prop (no new API call). Each component gains three state variables, conditionally renders `BeforeAfterCapture` below the category selector, and gates its submit button on photos being ready. Both components are modified in parallel since they share zero state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase. No test framework — verification via `tsc --noEmit`, `npm run lint`, and manual curl smoke tests.

---

## Task 1: Extend CategoryOption type and server queries

**Files:**
- Modify: `src/app/app/checkout/page.tsx`
- Modify: `src/app/app/progress/page.tsx`

Both server components feed their children a `categories` array. We add `requires_photos` to the select query and to the TypeScript type so it flows down to the client components.

**Step 1: Update checkout page query and prop type**

Open `src/app/app/checkout/page.tsx`. Find the query that fetches service categories (look for `.select(` on `service_categories`). Change it to include `requires_photos`:

```ts
.select("id, name, requires_photos")
```

Then find the `CategoryOption` type (either inline or imported) and add the field:

```ts
interface CategoryOption {
  id: string;
  name: string;
  requires_photos: boolean;
}
```

If the type is defined inside `CheckoutFlow.tsx` instead, update it there — we'll catch it in Task 2.

**Step 2: Update progress page query and prop type**

Same change in `src/app/app/progress/page.tsx` — add `requires_photos` to the categories select query and `CategoryOption` type.

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors (or only pre-existing unrelated errors — note any new ones).

**Step 4: Commit**

```bash
git add src/app/app/checkout/page.tsx src/app/app/progress/page.tsx
git commit -m "feat: add requires_photos to categories query and prop types"
```

---

## Task 2: Wire BeforeAfterCapture into CheckoutFlow

**Files:**
- Modify: `src/app/app/checkout/_components/CheckoutFlow.tsx`

`CheckoutFlow` already imports nothing from `@/components` — we add one import and three state variables.

**Step 1: Add the import**

At the top of `CheckoutFlow.tsx`, after the existing imports, add:

```ts
import BeforeAfterCapture from "@/components/BeforeAfterCapture";
```

**Step 2: Extend CategoryOption type**

Find the existing `CategoryOption` interface inside the file and add `requires_photos`:

```ts
interface CategoryOption {
  id: string;
  name: string;
  requires_photos: boolean;  // ← add this
}
```

**Step 3: Add photo state inside the component**

Inside `CheckoutFlow`, after the existing state declarations, add:

```ts
const [photosRequired, setPhotosRequired]   = useState(false);
const [capturedPhotos, setCapturedPhotos]   = useState<{
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}>({});

const photosReady = !photosRequired
  || (!!capturedPhotos.beforePhotoUrl && !!capturedPhotos.afterPhotoUrl);
```

**Step 4: Reset photos when category changes**

Find the existing `<select>` for Service Type. Replace its `onChange` handler:

```tsx
// Before
onChange={(e) => setCategoryId(e.target.value)}

// After
onChange={(e) => {
  const newId = e.target.value;
  setCategoryId(newId);
  const cat = categories.find((c) => c.id === newId);
  setPhotosRequired(cat?.requires_photos ?? false);
  setCapturedPhotos({});   // reset stale photos from a previous selection
}}
```

**Step 5: Render BeforeAfterCapture below the category select**

Directly after the closing `</div>` of the Service Type field block (the one wrapping the category `<select>`), add:

```tsx
{photosRequired && (
  <div>
    <label style={labelStyle}>Before & After Photos <span style={{ color: "#9E5A5A" }}>*</span></label>
    <BeforeAfterCapture
      clientId={clientId || undefined}
      required={photosRequired}
      onPhotosChange={setCapturedPhotos}
    />
  </div>
)}
```

**Step 6: Gate the submit button**

Find the "Complete Payment" `<button>`. Update its `disabled` prop:

```tsx
// Before
disabled={processing || !studentId || !categoryId}

// After
disabled={processing || !studentId || !categoryId || !photosReady}
```

Update its label to explain the block:

```tsx
{processing
  ? "Processing..."
  : (photosRequired && !photosReady)
    ? "Add Photos to Continue"
    : "Complete Payment"}
```

**Step 7: Pass photo URLs to the completion call**

Find the `fetch("/api/services/complete", ...)` call inside `completePayment()`. Add to the JSON body:

```ts
body: JSON.stringify({
  studentId,
  studentName: student?.studentName || "",
  categoryId,
  clientId: clientId || undefined,
  beforePhotoUrl: capturedPhotos.beforePhotoUrl,   // ← add
  afterPhotoUrl:  capturedPhotos.afterPhotoUrl,    // ← add
}),
```

**Step 8: Reset photo state in the `reset()` function**

Find the `reset()` function and add:

```ts
setPhotosRequired(false);
setCapturedPhotos({});
```

**Step 9: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 10: Commit**

```bash
git add src/app/app/checkout/_components/CheckoutFlow.tsx
git commit -m "feat: wire BeforeAfterCapture into CheckoutFlow (Rule 9 Step 4)"
```

---

## Task 3: Wire BeforeAfterCapture into ProgressDashboard

**Files:**
- Modify: `src/app/app/progress/_components/ProgressDashboard.tsx`

`ProgressDashboard` has a "Log Service" inline modal (not a separate component). The pattern is identical to Task 2.

**Step 1: Add the import**

```ts
import BeforeAfterCapture from "@/components/BeforeAfterCapture";
```

**Step 2: Extend CategoryOption type in ProgressDashboard**

Find the `CategoryOption` interface (or inline type) and add `requires_photos: boolean`.

**Step 3: Add photo state**

Inside `ProgressDashboard`, locate the state block used by the log-service modal. Add:

```ts
const [photosRequired, setPhotosRequired]   = useState(false);
const [capturedPhotos, setCapturedPhotos]   = useState<{
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}>({});

const photosReady = !photosRequired
  || (!!capturedPhotos.beforePhotoUrl && !!capturedPhotos.afterPhotoUrl);
```

**Step 4: Reset photos on category change**

Find the category `<select>` inside the log modal. Update `onChange`:

```tsx
onChange={(e) => {
  const newId = e.target.value;
  setCategoryId(newId);
  const cat = categories.find((c) => c.id === newId);
  setPhotosRequired(cat?.requires_photos ?? false);
  setCapturedPhotos({});
}}
```

**Step 5: Render BeforeAfterCapture inside the modal**

Below the category select block inside the modal, add:

```tsx
{photosRequired && (
  <div style={{ marginTop: 12 }}>
    <p style={{
      fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "#8A8778", marginBottom: "8px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      Before & After Photos <span style={{ color: "#9E5A5A" }}>*</span>
    </p>
    <BeforeAfterCapture
      required={photosRequired}
      onPhotosChange={setCapturedPhotos}
    />
  </div>
)}
```

(No `clientId` — ProgressDashboard doesn't collect a client at log time.)

**Step 6: Gate the submit button**

Find the log-service submit button. Update `disabled`:

```tsx
disabled={submitting || !selectedStudent || !selectedCategory || !photosReady}
```

Update the label:

```tsx
{submitting
  ? "Logging..."
  : (photosRequired && !photosReady)
    ? "Add Photos to Continue"
    : "Log Service"}
```

(Variable names may differ — match what's already in the file.)

**Step 7: Pass photo URLs to the completion call**

Find the `fetch("/api/services/complete", ...)` call inside the log handler. Add:

```ts
beforePhotoUrl: capturedPhotos.beforePhotoUrl,
afterPhotoUrl:  capturedPhotos.afterPhotoUrl,
```

**Step 8: Reset photo state when modal closes or resets**

Wherever the modal is cleared (close button, after success), add:

```ts
setPhotosRequired(false);
setCapturedPhotos({});
```

**Step 9: Verify TypeScript and lint**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | head -40
```

Expected: no new errors.

**Step 10: Commit**

```bash
git add src/app/app/progress/_components/ProgressDashboard.tsx
git commit -m "feat: wire BeforeAfterCapture into ProgressDashboard (Rule 9 Step 4)"
```

---

## Task 4: Manual smoke test

**Step 1: Start dev server**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npm run dev
```

**Step 2: Smoke test — photo block enforced**

1. Go to `/app/checkout`
2. Select a student and pick "Color" or "Highlight / Foil" from the service dropdown
3. Expected: `BeforeAfterCapture` slides in with two dashed-gold placeholder panels
4. Expected: submit button reads **"Add Photos to Continue"** and is disabled
5. Take/upload a before photo → button stays disabled (only one photo)
6. Take/upload an after photo → button changes to **"Complete Payment"** and becomes active
7. Submit — check Supabase `service_completions` table for the new row; confirm `before_photo_url` and `after_photo_url` are populated

**Step 3: Smoke test — non-photo service unaffected**

1. Select "Haircut" or "Blowout"
2. Expected: `BeforeAfterCapture` does NOT appear
3. Expected: submit button reads "Complete Payment" and is enabled as soon as student + category are set

**Step 4: Smoke test — ProgressDashboard**

1. Go to `/app/progress`
2. Open "Log Service" modal
3. Select "Perm / Wave" or "Chemical Straightening"
4. Expected: photo capture UI appears inside the modal
5. Select "Shampoo & Style"
6. Expected: photo capture UI disappears, photos state resets

**Step 5: Final commit if all passes**

```bash
git add -A
git commit -m "feat: Module 8 complete — before/after photos integrated into checkout and progress flows"
```

---

## Reference

- Design doc: `docs/plans/2026-03-31-before-after-photo-integration-design.md`
- `BeforeAfterCapture`: `src/components/BeforeAfterCapture.tsx` — do not modify
- Upload API: `src/app/api/photos/upload/route.ts` — do not modify
- Completion API: `src/app/api/services/complete/route.ts` — do not modify
- Migration: `migrations/2026-03-31-client-portal-enhancements.sql` — already applied
