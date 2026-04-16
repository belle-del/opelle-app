# Theming Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate all hardcoded colors to CSS variables, wire the client portal to ThemeProvider, remove dead plant presets, and align Tailwind config with CSS variables — unblocking Module 15 (White-Label Theming).

**Architecture:** CSS variables in `globals.css` are the single source of truth. `ThemeProvider` injects overrides via `generateThemeCSS()`. Tailwind config references CSS vars. All components use `var(--name)` instead of hex literals.

**Tech Stack:** Next.js 14, Tailwind CSS v4, CSS custom properties, Supabase (JSONB theme column)

---

### Task 1: Add --text-muted CSS Variable

**Files:**
- Modify: `src/app/globals.css:73-77`

**Step 1: Add the variable to :root**

In `globals.css`, inside the `:root` block, after `--text-on-stone-ghost`, add:

```css
  --text-muted: #7A7A72;
```

Also fix the body background to use a variable instead of hardcoded hex:

```css
body {
  background-color: var(--bark-mid);
```

**Step 2: Verify the app still builds**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add --text-muted variable and use var for body bg"
```

---

### Task 2: Client Portal ThemeProvider

**Files:**
- Modify: `src/app/client/(portal)/layout.tsx`

**Step 1: Add theme fetch and ThemeProvider wrapper**

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ClientPortalShell } from "./_components/ClientPortalShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { WorkspaceTheme } from "@/lib/types";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getClientContext();

  if (!ctx) {
    redirect("/client/join");
  }

  // Fetch workspace theme separately
  const admin = createSupabaseAdminClient();
  const { data: workspace } = await admin
    .from("workspaces")
    .select("theme")
    .eq("id", ctx.clientUser.workspaceId)
    .single();

  const theme: WorkspaceTheme | null = (workspace?.theme as WorkspaceTheme) ?? null;

  return (
    <ThemeProvider theme={theme}>
      <ClientPortalShell
        clientFirstName={ctx.client.firstName}
        stylistName={ctx.stylistName}
      >
        {children}
      </ClientPortalShell>
    </ThemeProvider>
  );
}
```

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/client/\(portal\)/layout.tsx
git commit -m "feat(theme): wrap client portal in ThemeProvider"
```

---

### Task 3: Replace Hardcoded Hex in ClientPortalShell

**Files:**
- Modify: `src/app/client/(portal)/_components/ClientPortalShell.tsx`

**Step 1: Replace all hardcoded hex values with CSS variables**

Apply these replacements throughout the file:

| Find | Replace |
|------|---------|
| `"#C4AB70"` | `"var(--brass)"` |
| `"#F7F4EF"` | `"var(--stone-lightest)"` |
| `"#2C2C24"` | `"var(--text-on-stone)"` |
| `"#3D3D35"` | `"var(--olive-mid)"` |
| `"#8A8778"` | `"var(--text-muted)"` |
| `"#D5D0C7"` | `"var(--stone-warm)"` |
| `"#EDE9E1"` | `"var(--stone-light)"` |
| `"#9E5A5A"` | `"var(--garnet-blush)"` |
| `"rgba(255,255,255,0.45)"` | `"var(--brass-soft)"` (for nav text inactive) |

Notes:
- In `NavIcon` and `MoreIcon`, the `color` variable is used in SVG `stroke={}` attributes. CSS vars work in inline SVG stroke attributes.
- The header and bottom nav `background: "#2C2C24"` becomes `background: "var(--text-on-stone)"`.
- The `#FFFFFF` for the more drawer can stay white (it's a surface, not a brand color) OR become `var(--stone-lightest)` for consistency. Use `var(--stone-lightest)`.

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/client/\(portal\)/_components/ClientPortalShell.tsx
git commit -m "refactor(theme): replace hardcoded hex with CSS vars in ClientPortalShell"
```

---

### Task 4: Replace Hardcoded Hex in HomeDashboard

**Files:**
- Modify: `src/app/client/(portal)/_components/HomeDashboard.tsx`

**Step 1: Replace all hardcoded hex values**

Apply these replacements:

| Find | Replace |
|------|---------|
| `"#C4AB70"` | `"var(--brass)"` |
| `"#2C2C24"` | `"var(--text-on-stone)"` |
| `"#8A8778"` | `"var(--text-muted)"` |
| `"#F7F4EF"` | `"var(--stone-lightest)"` |
| `"#FAF8F3"` | `"var(--stone-lightest)"` |
| `"#3D3D35"` | `"var(--olive-mid)"` |
| `"#9E5A5A"` | `"var(--garnet-blush)"` |
| `"#5C5A4F"` | `"var(--text-on-stone-faint)"` |
| `"#EDE9E1"` | `"var(--stone-light)"` |
| `"#B89D5C"` | `"var(--brass-warm)"` |
| `"#6A8E66"` | keep as-is (semantic "seasonal" green, not a brand color) |

For `categoryColors` constant:
```tsx
const categoryColors: Record<string, { bg: string; text: string }> = {
  tip: { bg: "var(--brass)", text: "var(--text-on-stone)" },
  product_spotlight: { bg: "var(--garnet-blush)", text: "#FFF" },
  seasonal: { bg: "#6A8E66", text: "#FFF" },
};
```

For `QuickActionIcon`, replace `const color = "#C4AB70"` with `const color = "var(--brass)"`.

For `NotificationIcon`, replace `const color = "#5C5A4F"` with `const color = "var(--text-on-stone-faint)"`.

For gradient backgrounds like `background: "linear-gradient(135deg, #C4AB70 0%, #B89D5C 100%)"`, replace with:
```tsx
background: "linear-gradient(135deg, var(--brass) 0%, var(--brass-warm) 100%)"
```

And `background: "linear-gradient(135deg, #2C2C24 0%, #3D3D35 100%)"` becomes:
```tsx
background: "linear-gradient(135deg, var(--text-on-stone) 0%, var(--olive-mid) 100%)"
```

For `rgba(196,171,112,0.12)`, replace with `"var(--brass-glow)"` (defined as 0.08 opacity but close enough, or keep the rgba with var: just use `var(--brass-glow)`).

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/client/\(portal\)/_components/HomeDashboard.tsx
git commit -m "refactor(theme): replace hardcoded hex with CSS vars in HomeDashboard"
```

---

### Task 5: Replace Hardcoded Hex in InspoFollowUp

**Files:**
- Modify: `src/app/client/(portal)/inspo/_components/InspoFollowUp.tsx`

**Step 1: Replace all hardcoded hex values**

| Find | Replace |
|------|---------|
| `"#2C2C24"` | `"var(--text-on-stone)"` |
| `"#7A7A72"` | `"var(--text-muted)"` |
| `"#E8E0D0"` | `"var(--stone-warm)"` |
| `"#FAF8F3"` | `"var(--stone-lightest)"` |
| `"#D4C9B5"` | `"var(--stone-deep)"` |

Note: Many values already use `var(--brass, #C4AB70)` fallback syntax — replace those with just `var(--brass)` (the fallback is no longer needed since we guarantee the var exists).

For example: `"var(--brass, #C4AB70)"` → `"var(--brass)"` and `"var(--status-confirmed, #4A7C59)"` → `"var(--status-confirmed)"`.

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/client/\(portal\)/inspo/_components/InspoFollowUp.tsx
git commit -m "refactor(theme): replace hardcoded hex with CSS vars in InspoFollowUp"
```

---

### Task 6: Replace Hardcoded Hex in History Page

**Files:**
- Modify: `src/app/client/(portal)/history/page.tsx`

**Step 1: Replace all hardcoded hex values**

| Find | Replace |
|------|---------|
| `"#2C2C24"` | `"var(--text-on-stone)"` |
| `"#7A7A72"` | `"var(--text-muted)"` |
| `"#C4AB70"` | `"var(--brass)"` |
| `"#8A8778"` | `"var(--text-muted)"` |
| `"#5C5A4F"` | `"var(--text-on-stone-faint)"` |
| `"#9E5A5A"` | `"var(--garnet-blush)"` |
| `"#4A7C59"` | `"var(--status-confirmed)"` |

In `getStatusBadge`, update the color values:
```tsx
function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "var(--status-confirmed)", bg: "rgba(74, 124, 89, 0.1)" };
    case "scheduled":
      return { label: "Upcoming", color: "var(--brass)", bg: "var(--brass-glow)" };
    case "pending_confirmation":
      return { label: "Pending", color: "var(--garnet-blush)", bg: "rgba(158, 90, 90, 0.1)" };
    case "cancelled":
      return { label: "Cancelled", color: "var(--text-muted)", bg: "rgba(122, 122, 114, 0.1)" };
    default:
      return { label: status, color: "var(--text-muted)", bg: "rgba(122, 122, 114, 0.1)" };
  }
}
```

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/client/\(portal\)/history/page.tsx
git commit -m "refactor(theme): replace hardcoded hex with CSS vars in history page"
```

---

### Task 7: Replace Hardcoded Hex in TranslationsPage

**Files:**
- Modify: `src/app/app/translations/_components/TranslationsPage.tsx`

**Step 1: Replace all hardcoded hex values**

| Find | Replace |
|------|---------|
| `"#2C2C24"` | `"var(--text-on-stone)"` |
| `"#4A3C2A"` | `"var(--text-on-stone-dim)"` |
| `"#5C5347"` | `"var(--text-on-stone-faint)"` |
| `"#7A7060"` | `"var(--text-muted)"` |
| `"#4A7C59"` | `"var(--status-confirmed)"` |
| `"#8B3A3A"` | `"var(--garnet)"` |
| `"#B8860B"` | `"var(--brass)"` |

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/app/translations/_components/TranslationsPage.tsx
git commit -m "refactor(theme): replace hardcoded hex with CSS vars in TranslationsPage"
```

---

### Task 8: Replace Hardcoded Hex in DevPanel

**Files:**
- Modify: `src/app/app/_components/DevPanel.tsx`

**Step 1: Replace hardcoded hex values**

The DevPanel is a developer tool that only shows for `belle@dominusfoundry.com`. It uses a dark theme (`#1A1A14` background) distinct from the app theme, which is intentional.

Replace only the brand-color references:
| Find | Replace |
|------|---------|
| `"#C4AB70"` (in LEVEL_COLORS, tab borders, context values) | `"var(--brass)"` |
| `"#8FADC8"` (in LEVEL_COLORS, network method) | `"var(--blue)"` |

Leave the dark-theme structural colors (`#1A1A14`, `rgba(241,239,224,...)`, `#2C2C24` for trigger button) as-is — these are intentionally distinct from the brand theme.

Leave `MODE_COLORS` as-is — they're dev-only semantic colors for simulating view modes.

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/app/_components/DevPanel.tsx
git commit -m "refactor(theme): replace brand color hex with CSS vars in DevPanel"
```

---

### Task 9: Remove Missing Plant Presets

**Files:**
- Modify: `src/lib/theme.ts:60-69`
- Modify: `src/app/app/settings/_components/BrandingConfig.tsx:13-22`

**Step 1: Trim PLANT_PRESETS in theme.ts**

Replace lines 60-69 with:

```typescript
export const PLANT_PRESETS: Record<string, string> = {
  "olive-branch": "/textures/olive-branch.svg",
};
```

**Step 2: Trim PLANT_OPTIONS in BrandingConfig.tsx**

Replace lines 13-22 with:

```typescript
const PLANT_OPTIONS = [
  { key: "olive-branch", label: "Olive Branch" },
];
```

**Step 3: Replace BrandingConfig hardcoded colors with CSS vars**

Replace lines 7-11:
```typescript
const BRASS = "var(--brass)";
const STONE = "var(--stone-light)";
const STONE_MID = "var(--stone-deep)";
const TEXT_MAIN = "var(--text-on-stone)";
const TEXT_FAINT = "var(--text-on-stone-faint)";
```

**Step 4: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 5: Commit**

```bash
git add src/lib/theme.ts src/app/app/settings/_components/BrandingConfig.tsx
git commit -m "feat(theme): remove missing plant presets, use CSS vars in BrandingConfig"
```

---

### Task 10: Align Tailwind Config with CSS Variables

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Rewrite colors to use CSS variables**

Replace the entire file with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bark: {
          deepest: "var(--bark-deepest)",
          DEFAULT: "var(--bark)",
          mid: "var(--bark-mid)",
          warm: "var(--bark-warm)",
          light: "var(--bark-light)",
          pale: "var(--bark-pale)",
        },
        stone: {
          lightest: "var(--stone-lightest)",
          light: "var(--stone-light)",
          mid: "var(--stone-mid)",
          warm: "var(--stone-warm)",
          deep: "var(--stone-deep)",
          shadow: "var(--stone-shadow)",
          card: "var(--stone-card)",
        },
        garnet: {
          black: "var(--garnet-black)",
          deep: "var(--garnet-deep)",
          DEFAULT: "var(--garnet)",
          vivid: "var(--garnet-vivid)",
          ruby: "var(--garnet-ruby)",
          blush: "var(--garnet-blush)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          warm: "var(--brass-warm)",
          bright: "var(--brass-bright)",
        },
        olive: {
          black: "var(--olive-black)",
          dark: "var(--olive-dark)",
          DEFAULT: "var(--olive)",
          mid: "var(--olive-mid)",
          sage: "var(--olive-sage)",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        brand: ["'Cormorant Garamond'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 2: Verify the build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): align Tailwind config colors with CSS variables"
```

---

### Task 11: Final Verification

**Step 1: Full build check**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors

**Step 2: Push to GitHub**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && git push`

**Step 3: Verify Vercel deployment succeeds**

Check deployment status after push.
