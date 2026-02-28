# Dashboard Grid Redesign — 16x16 Freeform Grid

**Date:** 2026-02-27
**Status:** Approved

## Summary

Replace the current 3-column preset-based widget grid (S/M/W/L/XL) with a 16x16 freeform CSS grid where widgets can be any dimension from 1x1 to 16x16. Add decorative olive vine border-image to all widget cards.

## Deliverable

A standalone HTML prototype (`docs/prototypes/dashboard-grid.html`) demonstrating:
- 16x16 CSS grid layout
- Drag-to-resize handles (corner + edge)
- Precise dimension input popover (W x H)
- Olive vine border-image on widget cards
- Opelle design tokens (stone, brass, garnet, olive palette)
- Placeholder widget content matching existing types

## Grid System

- **Grid**: `display: grid; grid-template-columns: repeat(16, 1fr); grid-template-rows: repeat(16, 1fr)`
- **Auto-flow**: `grid-auto-flow: dense` to fill gaps
- **Widget placement**: `grid-column: span N; grid-row: span N` where N is 1-16
- **No constraints**: Any widget can be any size from 1x1 to 16x16

## Resize Interaction

1. **Drag handles**: Bottom-right corner handle + right edge + bottom edge. Mouse events calculate grid cell deltas and snap.
2. **Dimension input**: Click resize icon on widget -> popover with two number inputs (width x height columns/rows). Apply button confirms.

## Vine Border

- Inline SVG olive vine pattern used as CSS `border-image`
- Continuous vine with small leaves along all four edges
- Colors: `--brass` / `--olive-sage` tones at ~30% opacity
- Subtle enough to frame without competing with content

## Design Tokens (from globals.css)

- Card background: `--stone-card: #F1EFE0`
- Card border: `--stone-mid: #D7D5C5`
- Text primary: `--text-on-stone: #000000`
- Text secondary: `--text-on-stone-faint: #3B3C23`
- Accent brass: `--brass: #C4AB70`
- Accent garnet: `--garnet: #440606`
- Olive dark: `--olive: #1f231a`
- Page background: `--stone-warm: #CAC7B5`

## Widget Types (placeholder content)

1. **Schedule** — time slots with sample appointments
2. **Revenue** — stat card with number + label
3. **Formulas** — stat card with count
4. **Tasks** — checklist with sample items
5. **Activity** — timeline dots with names/times
6. **Inventory** — pill badges with product names

## Approach

CSS Grid (Approach A) — native grid handles layout, no external libraries needed. Pure HTML/CSS/JS prototype.
