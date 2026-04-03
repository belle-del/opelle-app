# White-Label Theming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow each workspace to customize colors, logo, botanical, background texture, and typography via a settings UI, with CSS variable overrides applied on page load.

**Architecture:** JSONB `theme` column on workspaces table. `generateThemeCSS(theme)` maps 4 user colors to 60+ CSS variable overrides. `ThemeProvider` server component in the app layout renders a style tag with the generated CSS. Settings UI in a new BrandingConfig component. Asset uploads to Supabase Storage `theme-assets` bucket.

**Tech Stack:** Next.js App Router, Supabase (admin client + Storage), CSS custom properties, color manipulation (manual hex math, no library)

**Security note:** The ThemeProvider renders generated CSS (not user-provided HTML). The `generateThemeCSS` function only outputs CSS property values derived from validated hex color strings and preset names — no user-supplied HTML or scripts are injected.

---

### Task 1: Database migration — add theme column to workspaces

**Files:**
- Create: `supabase/migrations/015_white_label_theming.sql`

**Step 1: Write the migration**

```sql
-- Module 15: White-Label Theming
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
}'::jsonb;
```

**Step 2: Commit**

```bash
git add supabase/migrations/015_white_label_theming.sql
git commit -m "feat(theming): add theme JSONB column to workspaces table"
```

---

### Task 2: Add WorkspaceTheme type and update Workspace type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add WorkspaceTheme type** (near the Workspace types)

```typescript
export type WorkspaceTheme = {
  logo_url: string | null;
  plant: string;
  background_texture: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    highlight: string;
  };
  typography: string;
};
```

**Step 2: Add `theme` field to both `Workspace` and `WorkspaceRow` types**

**Step 3: Update getCurrentWorkspace** in `src/lib/db/workspaces.ts` if it selects specific columns — ensure `theme` is included.

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/db/workspaces.ts
git commit -m "feat(theming): add WorkspaceTheme type, theme field to Workspace"
```

---

### Task 3: Create theme engine — generateThemeCSS + presets

**Files:**
- Create: `src/lib/theme.ts`

**Step 1: Write the theme engine**

Contains:
- Color utilities: `hexToRgb`, `rgbToHex`, `lightenHex`, `darkenHex`, `getLuminance`, `getContrastColor`, `hexToRgba`
- Preset maps: `TYPOGRAPHY_PRESETS`, `PLANT_PRESETS`, `BACKGROUND_PRESETS`
- `generateThemeCSS(theme)` — maps 4 user colors to CSS variable overrides for :root, body background, body::before (botanical), and heading fonts

The function generates ONLY CSS declarations from validated hex colors and known preset values. No user-supplied strings are included in the output except hex color values which are validated by the color utility functions.

Typography presets:
- classic: Fraunces + DM Sans
- modern: Inter + Inter
- elegant: Cormorant Garamond + DM Sans
- bold: Montserrat + DM Sans
- minimal: DM Sans + DM Sans

Plant presets: olive-branch, monstera, fern, succulent, cherry-blossom, eucalyptus, palm, fiddle-leaf (SVG files in /public/textures/)

Background presets: botanical-light, botanical-dark, marble, concrete, wood-grain, linen, solid, custom

**Step 2: Commit**

```bash
git add src/lib/theme.ts
git commit -m "feat(theming): add theme engine with CSS generation, presets, color utilities"
```

---

### Task 4: Create ThemeProvider and integrate into app layout

**Files:**
- Create: `src/components/ThemeProvider.tsx`
- Modify: `src/app/app/layout.tsx`

**Step 1: Create ThemeProvider**

A server component that:
1. Receives the workspace theme as a prop
2. Calls `generateThemeCSS(theme)` to produce a CSS string
3. Renders the CSS in a style element

If theme is null, renders nothing (falls back to defaults in globals.css).

**Step 2: Integrate into app layout**

Import ThemeProvider. The workspace is already fetched at line 27: `const workspace = await getCurrentWorkspace();`

Wrap the existing content with ThemeProvider, passing `workspace?.theme`.

**Step 3: Commit**

```bash
git add src/components/ThemeProvider.tsx src/app/app/layout.tsx
git commit -m "feat(theming): add ThemeProvider, integrate into app layout"
```

---

### Task 5: Create theme API routes

**Files:**
- Create: `src/app/api/settings/theme/route.ts` (GET + PATCH)
- Create: `src/app/api/settings/theme/upload/route.ts` (POST)

**Step 1: GET /api/settings/theme**

Returns the workspace's theme JSONB. Auth required, workspace resolved via getWorkspaceId.

**Step 2: PATCH /api/settings/theme**

Accepts full theme object as body. Owner-only (checks workspace.owner_id === user.id). Updates the workspaces.theme column.

**Step 3: POST /api/settings/theme/upload**

Accepts FormData with `file` and `asset_type` (logo/plant/background). Uploads to Supabase Storage bucket `theme-assets` at path `{workspaceId}/{assetType}.{ext}`. Returns public URL. Owner-only.

**Step 4: Commit**

```bash
git add src/app/api/settings/theme/
git commit -m "feat(theming): add GET/PATCH/POST API routes for theme settings"
```

---

### Task 6: Create BrandingConfig settings component

**Files:**
- Create: `src/app/app/settings/_components/BrandingConfig.tsx`

**Step 1: Create the client component**

A "use client" component with sections:

1. **Logo** — File upload button. On upload, POSTs to `/api/settings/theme/upload` with asset_type="logo", then updates the theme state with the returned URL.

2. **Plant selector** — Grid of 8 preset thumbnail cards. Each shows the plant name. Selected card is highlighted with brass border. Clicking sets the plant in theme state.

3. **Background selector** — Grid of 8 preset cards with texture name. Selected highlighted.

4. **Color palette** — 4 color inputs (type="color") for primary, secondary, accent, highlight. Each with a label and hex value display.

5. **Typography selector** — 5 cards showing preset name + font sample text ("The quick brown fox"). Selected highlighted.

6. **Save button** — PATCHes `/api/settings/theme` with the full theme object. Shows success message on save.

Styling: Uses existing Opelle design constants and Card/CardContent from UI components.

**Step 2: Commit**

```bash
git add src/app/app/settings/_components/BrandingConfig.tsx
git commit -m "feat(theming): add BrandingConfig settings component"
```

---

### Task 7: Add BrandingConfig to settings page

**Files:**
- Modify: `src/app/app/settings/page.tsx`

**Step 1: Import BrandingConfig and add a new Card section**

Add after the Workspace section, before Service Types:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Branding</CardTitle>
    <CardDescription>
      Customize your workspace appearance — colors, logo, background, and typography.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <BrandingConfig />
  </CardContent>
</Card>
```

**Step 2: Commit**

```bash
git add src/app/app/settings/page.tsx
git commit -m "feat(theming): add Branding section to settings page"
```

---

### Task 8: Push to GitHub + apply migration + verify

**Step 1: Push**

```bash
git push origin HEAD
```

**Step 2: Apply migration in Supabase SQL editor**

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
}'::jsonb;
```

**Step 3: Verify on live site**

- Go to `/app/settings` — Branding section should appear
- Change accent color to blue → Save → Refresh → garnet elements should be blue
- Change typography to "elegant" → Save → Refresh → headings should use Cormorant Garamond
- Upload a logo → URL stored in theme
- Default look unchanged for workspaces that haven't customized
