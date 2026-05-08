# Contract Update — `available_services` on `/api/v1/ai/analyze-inspo-vision`

> Status: **Opélle side shipped.** Kernel side **pending Mark.**
> Owner: Belle (Opélle) → Mark (Kernel)
> Date: 2026-05-08

## What changed

Opélle now sends a new field with every `analyze-inspo-vision` request:

```json
"available_services": ["Tape-ins", "K-tips", "I-tips", "Wefts", "Tinsel",
                       "Vivids", "Blonding", "Color formulation",
                       "Women's cuts", "Men's cuts",
                       "Custom nail art", "Acrylic", "Gel-X", "Gel overlay"]
```

This is a flat array of service names sourced from the workspace's
`service_types` table. The list is per-workspace, so different stylists
will send different lists. It may be `null` if the workspace has no
configured services.

## Why

The current per-photo follow-up questions only think in terms of the
photo. When a client uploads inspo of long, full hair and their current
hair is shorter, the AI asks "are you hoping to maintain length, or
open to a trim?" — completely missing extensions as a path *to* the
look the client wants.

The fix: tell the AI what services the stylist offers, and let the
prompt consider them when generating questions.

## What the kernel needs to do

In the prompt for `analyze-inspo-vision`, add a section like:

> The stylist offers these services: **{available_services}**.
>
> When the inspo implies a transformation the stylist could deliver
> through one of these services, ask the client about it explicitly.
> Examples:
> - Inspo is much longer/fuller than current hair → ask about the
>   relevant extension method(s) from the list, not just trim vs keep.
> - Inspo is dramatically lighter/different color → ask about Blonding
>   or Vivids (whichever is offered).
> - Inspo has bold or themed nail art → ask about Custom nail art
>   commitment level.
>
> If `available_services` is `null` or empty, fall back to the existing
> prompt behavior (no service-specific framing).

## Compatibility

Until the kernel prompt formally reads `available_services`, Opélle
also appends the service list to `client_notes` so the existing prompt
picks them up. Once the kernel formalizes the dedicated field, the
fallback in `src/lib/ai/inspo-analysis.ts` (the `augmentedNotes` block)
can be removed.

## Where to look on the Opélle side

- `src/lib/kernel.ts` — `analyzeInspoVision()` adds the new field to
  the request body.
- `src/lib/ai/inspo-analysis.ts` — `analyzeInspoDirect()` forwards the
  list and injects it into `clientNotes` as a transitional measure.
- `src/app/api/public/consult/route.ts` — fetches `service_types` from
  the workspace before calling the AI.

## Test

After the kernel prompt update, submit a consult on
`belle-co-beauty.vercel.app` with photos showing significantly longer
or different hair than the description. The per-photo follow-up should
mention the relevant service from the list (e.g. "are you open to
tape-in extensions to reach this length?") instead of the generic
trim/keep framing.
