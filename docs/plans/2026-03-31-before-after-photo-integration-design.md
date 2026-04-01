# Before/After Photo Integration — Design Doc
Date: 2026-03-31
Build Bible: Rule 9 (Step 4), Module 8.3

## Problem
`BeforeAfterCapture.tsx`, `/api/photos/upload`, and the migration are all live. The
`service_completions` table has `before_photo_url`/`after_photo_url` columns.
`service_categories.requires_photos` is set for color/highlight/perm/straightening.
`/api/services/complete` already validates and accepts photo URLs.

The gap: `CheckoutFlow` and `ProgressDashboard` don't yet pass photos through.

## Approach — Option A: Inline reveal
Conditionally render `BeforeAfterCapture` inside the existing service-details card
in each component when the selected category has `requires_photos = true`. Gate the
submit button on photos being uploaded. No new modal, no new step, no new API call.

## Affected files

| File | Change |
|------|--------|
| `src/app/app/checkout/_components/CheckoutFlow.tsx` | Add photo state, render `BeforeAfterCapture`, gate submit |
| `src/app/app/progress/_components/ProgressDashboard.tsx` | Same pattern in log-service modal |
| `src/app/app/checkout/page.tsx` | Add `requires_photos` to categories query + prop type |
| `src/app/app/progress/page.tsx` | Same |

`BeforeAfterCapture.tsx`, `/api/photos/upload`, `/api/services/complete` — untouched.

## Data flow

1. Server components already fetch `service_categories` — add `requires_photos` to
   the `.select()` and to the `CategoryOption` TypeScript type.
2. No new API round-trip: `requires_photos` arrives with the existing categories prop.
3. On `categoryId` change, look up `requires_photos` from the local array, set state,
   reset `capturedPhotos` (prevent stale URLs from a previous selection).

## State additions (identical in both components)

```ts
const [photosRequired, setPhotosRequired]   = useState(false);
const [capturedPhotos, setCapturedPhotos]   = useState<{
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}>({});

const photosReady = !photosRequired
  || (!!capturedPhotos.beforePhotoUrl && !!capturedPhotos.afterPhotoUrl);
```

## UI placement

- Renders inside "Service Details" card, below the category `<select>`.
- Hidden when `!photosRequired` — zero added chrome for haircut/blowout services.
- `BeforeAfterCapture` props: `clientId`, `required={photosRequired}`,
  `onPhotosChange={setCapturedPhotos}`. No `appointmentId`.

## Submit button guard

```ts
disabled={processing || !studentId || !categoryId || !photosReady}
```

Label: `"Add Photos to Continue"` when `photosRequired && !photosReady`,
otherwise normal label. Self-explanatory without a separate error state.

## Completion call additions

```ts
beforePhotoUrl: capturedPhotos.beforePhotoUrl,
afterPhotoUrl:  capturedPhotos.afterPhotoUrl,
```

No `formulaData` — formula logging is separate from checkout/progress flows.

## Out of scope
- Formula history creation from checkout (formula entry UI handles that)
- `appointmentId` linking (neither flow has a live appointment at completion time)
- Any changes to `BeforeAfterCapture`, upload API, or completion API
