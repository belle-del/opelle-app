# Theming Consolidation Design — Module 15 Prerequisite

**Date:** 2026-04-15
**Status:** Ready for implementation
**Blocks:** Module 15 (White-Label Theming)

## Problem

The theming infrastructure is solid (CSS variables in globals.css, ThemeProvider, generateThemeCSS, DB theme JSONB column) but adoption is poor:

- Client portal has NO ThemeProvider — white-label doesn't work on the most important surface
- ~60+ files hardcode hex colors instead of using CSS variables
- Sidebar plant image is hardcoded in AppNav.tsx
- 7 of 8 plant presets reference missing SVGs
- Tailwind config colors conflict with globals.css CSS variables

## Design Decisions

### P1: Client Portal ThemeProvider

**Approach:** Separate theme fetch in client portal layout (not modifying getClientContext).

- In `app/client/(portal)/layout.tsx`, use admin client to fetch workspace theme via `workspaceId` from `getClientContext()`
- Wrap `<ClientPortalShell>` with `<ThemeProvider theme={...}>`
- Same pattern as `app/app/layout.tsx` line 33

### P2: Hardcoded Hex Consolidation

**Scope:** Top 6 offender files only (client portal first, then app components).

Color mapping:
| Hardcoded | Variable |
|-----------|----------|
| `#C4AB70` | `var(--brass)` |
| `#F1EFE0` / `#F7F4EF` / `#FAF8F3` | `var(--stone-lightest)` |
| `#2C2C24` / `#3D3D35` | `var(--text-on-stone)` |
| `#7A7A72` / `#8A8778` | `var(--text-muted)` (new) |
| `#9E5A5A` | `var(--garnet-blush)` |
| `#D5D0C7` / `#EDE9E1` | `var(--stone-warm)` |
| `rgba(196,171,112,...)` | `var(--brass-soft)` / `var(--brass-glow)` |
| `#1f231a` | `var(--bark-deepest)` |
| `#ABA499` | `var(--bark-mid)` |

### P3: Dynamic Sidebar Plant

The sidebar uses `olive-tree-cropped.png` (a different asset than the body background SVGs). For now, only make the body background plant dynamic (already handled by ThemeProvider/generateThemeCSS). The sidebar tree stays as-is until we have matching sidebar assets for each plant preset.

**Revisit:** When plant presets are expanded, create matching sidebar PNG/SVG variants.

### P4: Remove Missing Plant Presets (Option B)

Remove 7 missing presets from `PLANT_PRESETS` in theme.ts and from BrandingConfig.tsx selector. Keep only `olive-branch`. Ship with what works, add more later.

### P5: Tailwind/CSS Variable Alignment

Rewrite `tailwind.config.ts` colors to reference CSS variables. This makes `className="text-brass"` equivalent to `style={{ color: "var(--brass)" }}`.

### P6: Add `--text-muted` Variable

Add `--text-muted: #7A7A72;` to globals.css `:root` block.

## Files to Modify

| File | Change |
|------|--------|
| `src/app/client/(portal)/layout.tsx` | Add theme fetch + ThemeProvider wrapper |
| `src/app/globals.css` | Add `--text-muted`, fix body bg to use var |
| `src/lib/theme.ts` | Remove 7 missing plant presets |
| `tailwind.config.ts` | Rewrite colors to use CSS vars |
| `src/app/client/(portal)/_components/ClientPortalShell.tsx` | Replace hardcoded hex |
| `src/app/client/(portal)/_components/HomeDashboard.tsx` | Replace hardcoded hex |
| `src/app/client/(portal)/inspo/_components/InspoFollowUp.tsx` | Replace hardcoded hex |
| `src/app/client/(portal)/history/page.tsx` | Replace hardcoded hex |
| `src/app/app/translations/_components/TranslationsPage.tsx` | Replace hardcoded hex |
| `src/app/app/_components/DevPanel.tsx` | Replace hardcoded hex |
| `src/app/app/settings/_components/BrandingConfig.tsx` | Remove missing preset buttons |
