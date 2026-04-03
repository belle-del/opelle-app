# Module 15: White-Label Theming — Design Document

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Workspace-level theming with CSS variable overrides, asset uploads, settings UI

## Goal

Allow each workspace (school/salon) to customize their Opelle instance with custom colors, logo, botanical, background texture, and typography — without affecting other workspaces.

## Architecture

JSONB `theme` column on workspaces table. A `ThemeProvider` server component reads the theme and injects CSS variable overrides via a `<style>` tag. Settings UI in the existing settings page lets owners configure branding. Default theme matches current Opelle design.

## Key Design Decisions

1. **JSONB on workspaces, not a separate table.** Single query, no joins, easy to extend.
2. **CSS variable overrides, not component-level theming.** The existing 60+ CSS variables are already used throughout — we just override their values.
3. **4 user colors → full palette via auto-generation.** Primary/secondary/accent/highlight expand into light/dark/faint variants programmatically.
4. **Simple settings UI, no live preview for MVP.** Save and refresh. Live preview is a future iteration.
5. **Typography presets, not custom fonts.** 5 preset font pairings using already-loaded Google Fonts + system fonts.

## Database

Add column to workspaces:
```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{
  "logo_url": null,
  "plant": "olive-branch",
  "background_texture": "botanical-light",
  "colors": {
    "primary": "#5C5346",
    "secondary": "#A69F91",
    "accent": "#8B3A3A",
    "highlight": "#B8956E"
  },
  "typography": "classic"
}';
```

## Theme-to-CSS Mapping

| User Color | CSS Variables Overridden |
|-----------|--------------------------|
| primary | --bark, --bark-mid, --bark-warm, body background |
| secondary | --stone-card, --stone-light, --stone-mid, --stone-warm |
| accent | --garnet, --garnet-vivid, --garnet-blush |
| highlight | --brass, --brass-warm, --brass-bright, --brass-soft |

Auto-generated variants: lighten/darken by 10-20% for light/mid/warm suffixes.
Contrast text: auto-calculated via luminance check.

## Typography Presets

| Key | Heading Font | Body Font |
|-----|-------------|-----------|
| classic | Fraunces | DM Sans |
| modern | Inter | Inter |
| elegant | Cormorant Garamond | DM Sans |
| bold | Montserrat | DM Sans |
| minimal | DM Sans | DM Sans |

## Plant Presets

olive-branch (default), monstera, fern, succulent, cherry-blossom, eucalyptus, palm, fiddle-leaf. SVG files in `/public/textures/`. Custom upload to Supabase Storage.

## Background Texture Presets

botanical-light (default), botanical-dark, marble, concrete, wood-grain, linen, solid, custom. CSS patterns for marble/concrete/wood/linen — no asset files needed.

## API Endpoints

| Method | Route | Permission |
|--------|-------|------------|
| GET | /api/settings/theme | settings.manage |
| PATCH | /api/settings/theme | settings.manage |
| POST | /api/settings/theme/upload | settings.manage |

## Settings UI

New "Branding" section in `/app/settings/page.tsx`:
- Logo upload
- Plant selector grid (8 presets + custom)
- Background selector grid (8 presets + custom)
- 4 color pickers
- Typography selector cards (5 presets)
- Save button

## ThemeProvider

Server component in app layout:
1. Fetch workspace theme (from getCurrentWorkspace)
2. Generate CSS string from theme JSONB
3. Render `<style>` tag with CSS variable overrides
4. Fallback to defaults if no theme
