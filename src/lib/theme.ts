import type { WorkspaceTheme } from "@/lib/types";

// ─── Color Utilities ──────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.4 ? "#1A1A1A" : "#F1EFE0";
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Presets ──────────────────────────────────────────────────────────────

export const TYPOGRAPHY_PRESETS: Record<string, { heading: string; body: string; label: string }> = {
  classic: { heading: "'Fraunces', serif", body: "'DM Sans', sans-serif", label: "Classic" },
  modern: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif", label: "Modern" },
  elegant: { heading: "'Cormorant Garamond', serif", body: "'DM Sans', sans-serif", label: "Elegant" },
  bold: { heading: "'Montserrat', sans-serif", body: "'DM Sans', sans-serif", label: "Bold" },
  minimal: { heading: "'DM Sans', sans-serif", body: "'DM Sans', sans-serif", label: "Minimal" },
};

export const PLANT_PRESETS: Record<string, { background: string; sidebar: string; label: string }> = {
  "olive-branch":   { background: "/textures/olive-branch.svg",   sidebar: "/textures/olive-tree-cropped.png",     label: "Olive Branch" },
  monstera:         { background: "/textures/monstera.svg",        sidebar: "/textures/sidebar/monstera.svg",        label: "Monstera" },
  fern:             { background: "/textures/fern.svg",            sidebar: "/textures/sidebar/fern.svg",            label: "Fern" },
  succulent:        { background: "/textures/succulent.svg",       sidebar: "/textures/sidebar/succulent.svg",       label: "Succulent" },
  "cherry-blossom": { background: "/textures/cherry-blossom.svg",  sidebar: "/textures/sidebar/cherry-blossom.svg",  label: "Cherry Blossom" },
  eucalyptus:       { background: "/textures/eucalyptus.svg",      sidebar: "/textures/sidebar/eucalyptus.svg",      label: "Eucalyptus" },
};

export const BACKGROUND_PRESETS: Record<string, { label: string; opacity: number }> = {
  "botanical-light": { label: "Botanical Light", opacity: 0.35 },
  "botanical-dark": { label: "Botanical Dark", opacity: 0.15 },
  marble: { label: "Marble", opacity: 1 },
  concrete: { label: "Concrete", opacity: 1 },
  "wood-grain": { label: "Wood Grain", opacity: 0.15 },
  linen: { label: "Linen", opacity: 1 },
  solid: { label: "Solid Color", opacity: 0 },
  custom: { label: "Custom Upload", opacity: 0.35 },
};

// ─── Default Theme ────────────────────────────────────────────────────────

export const DEFAULT_THEME: WorkspaceTheme = {
  logo_url: null,
  plant: "olive-branch",
  background_texture: "botanical-light",
  colors: { primary: "#6E6960", secondary: "#F1EFE0", accent: "#440606", highlight: "#C4AB70" },
  typography: "classic",
};

// ─── CSS Generator ────────────────────────────────────────────────────────

export function generateThemeCSS(theme: WorkspaceTheme | null): string {
  const t = theme ?? DEFAULT_THEME;
  const { primary, secondary, accent, highlight } = t.colors;

  // Check if theme matches defaults — if so, no overrides needed
  const d = DEFAULT_THEME.colors;
  if (primary === d.primary && secondary === d.secondary && accent === d.accent && highlight === d.highlight && t.typography === "classic") {
    // Only override botanical/background if different from default
    if (t.plant === "olive-branch" && t.background_texture === "botanical-light") {
      return ""; // No CSS needed — defaults are in globals.css
    }
  }

  const typo = TYPOGRAPHY_PRESETS[t.typography] ?? TYPOGRAPHY_PRESETS.classic;
  const plantPreset = PLANT_PRESETS[t.plant] ?? PLANT_PRESETS["olive-branch"];
  const bgPreset = BACKGROUND_PRESETS[t.background_texture] ?? BACKGROUND_PRESETS["botanical-light"];

  const primaryLight = lightenHex(primary, 0.3);
  const secondaryLight = lightenHex(secondary, 0.4);
  const secondaryMid = lightenHex(secondary, 0.2);
  const secondaryWarm = darkenHex(secondary, 0.1);
  const accentVivid = lightenHex(accent, 0.15);
  const accentBlush = lightenHex(accent, 0.4);
  const highlightWarm = lightenHex(highlight, 0.15);
  const highlightBright = lightenHex(highlight, 0.3);

  const textOnSecondary = getContrastColor(secondaryLight);

  // Build background CSS based on texture type
  let bgImageCSS: string;
  if (t.background_texture === "solid") {
    bgImageCSS = "none";
  } else if (t.background_texture === "marble") {
    bgImageCSS = "linear-gradient(135deg, #f5f5f0 25%, #e8e5dc 50%, #f0ede4 75%)";
  } else if (t.background_texture === "concrete") {
    bgImageCSS = "linear-gradient(135deg, #d4d0c8 25%, #c8c4bc 50%, #d0ccc4 75%)";
  } else if (t.background_texture === "wood-grain") {
    bgImageCSS = "repeating-linear-gradient(90deg, #c4a882 0px, #b89b72 2px, #c4a882 4px)";
  } else if (t.background_texture === "linen") {
    bgImageCSS = "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)";
  } else {
    // botanical-light, botanical-dark, custom — use plant URL
    bgImageCSS = `url('${plantPreset.background}')`;
  }

  // Sidebar: derive dark background from primary color
  const sidebarBg = darkenHex(primary, 0.7);
  const sidebarBgSemi = hexToRgba(sidebarBg, 0.55);

  return [
    `:root {`,
    `  --bark: ${primary};`,
    `  --bark-mid: ${primaryLight};`,
    `  --bark-warm: ${lightenHex(primary, 0.15)};`,
    `  --bark-light: ${lightenHex(primary, 0.4)};`,
    `  --bark-pale: ${lightenHex(primary, 0.5)};`,
    `  --stone-card: ${secondaryLight};`,
    `  --stone-lightest: ${secondaryLight};`,
    `  --stone-light: ${lightenHex(secondary, 0.3)};`,
    `  --stone-mid: ${secondaryMid};`,
    `  --stone-warm: ${secondaryWarm};`,
    `  --stone-deep: ${darkenHex(secondary, 0.15)};`,
    `  --garnet: ${accent};`,
    `  --garnet-vivid: ${accentVivid};`,
    `  --garnet-blush: ${accentBlush};`,
    `  --garnet-wash: ${hexToRgba(accent, 0.1)};`,
    `  --brass: ${highlight};`,
    `  --brass-warm: ${highlightWarm};`,
    `  --brass-bright: ${highlightBright};`,
    `  --brass-soft: ${hexToRgba(highlight, 0.45)};`,
    `  --brass-glow: ${hexToRgba(highlight, 0.08)};`,
    `  --text-on-stone: ${textOnSecondary};`,
    `  --text-on-stone-dim: ${textOnSecondary === "#1A1A1A" ? "#2A2A2A" : "#E0DDD0"};`,
    `  --text-on-stone-faint: ${textOnSecondary === "#1A1A1A" ? "#3B3C23" : "#D4D0C0"};`,
    `  --text-on-stone-ghost: ${textOnSecondary === "#1A1A1A" ? "#9B988F" : "#B5B2A2"};`,
    `  --background: ${primary};`,
    `  --card: ${secondaryLight};`,
    `  --foreground: ${getContrastColor(primary)};`,
    `  --sidebar-bg: ${sidebarBg};`,
    `  --sidebar-bg-semi: ${sidebarBgSemi};`,
    `  --sidebar-image: url('${plantPreset.sidebar}');`,
    `}`,
    `body { background-color: ${primaryLight}; font-family: ${typo.body}; }`,
    `body::before { background-image: ${bgImageCSS}; opacity: ${bgPreset.opacity}; }`,
    `h1, h2, h3, h4, h5, h6 { font-family: ${typo.heading} !important; }`,
  ].join("\n");
}
