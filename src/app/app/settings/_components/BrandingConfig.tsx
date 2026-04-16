"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Check, Palette, Type, Flower2, Image } from "lucide-react";

const BRASS = "var(--brass)";
const STONE = "var(--stone-light)";
const STONE_MID = "var(--stone-deep)";
const TEXT_MAIN = "var(--text-on-stone)";
const TEXT_FAINT = "var(--text-on-stone-faint)";

const PLANT_OPTIONS = [
  { key: "olive-branch", label: "Olive Branch" },
];

const BACKGROUND_OPTIONS = [
  { key: "botanical-light", label: "Botanical Light" },
  { key: "botanical-dark", label: "Botanical Dark" },
  { key: "marble", label: "Marble" },
  { key: "concrete", label: "Concrete" },
  { key: "wood-grain", label: "Wood Grain" },
  { key: "linen", label: "Linen" },
  { key: "solid", label: "Solid Color" },
];

const TYPOGRAPHY_OPTIONS = [
  { key: "classic", label: "Classic", sample: "Fraunces + DM Sans" },
  { key: "modern", label: "Modern", sample: "Inter" },
  { key: "elegant", label: "Elegant", sample: "Cormorant Garamond + DM Sans" },
  { key: "bold", label: "Bold", sample: "Montserrat + DM Sans" },
  { key: "minimal", label: "Minimal", sample: "DM Sans" },
];

const DEFAULT_COLORS = {
  primary: "#6E6960",
  secondary: "#F1EFE0",
  accent: "#440606",
  highlight: "#C4AB70",
};

type Theme = {
  logo_url: string | null;
  plant: string;
  background_texture: string;
  colors: { primary: string; secondary: string; accent: string; highlight: string };
  typography: string;
};

export function BrandingConfig() {
  const [theme, setTheme] = useState<Theme>({
    logo_url: null,
    plant: "olive-branch",
    background_texture: "botanical-light",
    colors: { ...DEFAULT_COLORS },
    typography: "classic",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/settings/theme")
      .then((r) => r.json())
      .then((data) => {
        if (data.theme) setTheme(data.theme);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("asset_type", "logo");
      const res = await fetch("/api/settings/theme/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setTheme((prev) => ({ ...prev, logo_url: data.url }));
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const updateColor = (key: keyof typeof DEFAULT_COLORS, value: string) => {
    setTheme((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  if (loading) {
    return <p style={{ fontSize: 12, color: TEXT_FAINT, padding: "20px 0" }}>Loading theme settings...</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Logo */}
      <div>
        <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Upload size={14} /> Logo
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {theme.logo_url && (
            <img
              src={theme.logo_url}
              alt="Logo"
              style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, border: `1px solid ${STONE_MID}` }}
            />
          )}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 6, border: `1px solid ${STONE_MID}`,
            fontSize: 11, color: TEXT_MAIN, cursor: "pointer",
            background: uploading ? STONE : "transparent",
          }}>
            <Upload size={12} />
            {uploading ? "Uploading..." : theme.logo_url ? "Change Logo" : "Upload Logo"}
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {/* Plant Selector */}
      <div>
        <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Flower2 size={14} /> Botanical
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
          {PLANT_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setTheme((prev) => ({ ...prev, plant: p.key }))}
              style={{
                padding: "8px 6px", borderRadius: 8, border: `2px solid ${theme.plant === p.key ? BRASS : STONE_MID}`,
                background: theme.plant === p.key ? "rgba(196,171,112,0.1)" : "transparent",
                cursor: "pointer", textAlign: "center",
              }}
            >
              <p style={{ fontSize: 10, color: TEXT_MAIN, fontWeight: theme.plant === p.key ? 600 : 400, margin: 0 }}>
                {p.label}
              </p>
              {theme.plant === p.key && <Check size={12} style={{ color: BRASS, marginTop: 2 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Background Selector */}
      <div>
        <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Image size={14} /> Background Texture
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
          {BACKGROUND_OPTIONS.map((bg) => (
            <button
              key={bg.key}
              onClick={() => setTheme((prev) => ({ ...prev, background_texture: bg.key }))}
              style={{
                padding: "8px 6px", borderRadius: 8, border: `2px solid ${theme.background_texture === bg.key ? BRASS : STONE_MID}`,
                background: theme.background_texture === bg.key ? "rgba(196,171,112,0.1)" : "transparent",
                cursor: "pointer", textAlign: "center",
              }}
            >
              <p style={{ fontSize: 10, color: TEXT_MAIN, fontWeight: theme.background_texture === bg.key ? 600 : 400, margin: 0 }}>
                {bg.label}
              </p>
              {theme.background_texture === bg.key && <Check size={12} style={{ color: BRASS, marginTop: 2 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette */}
      <div>
        <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Palette size={14} /> Color Palette
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {(["primary", "secondary", "accent", "highlight"] as const).map((key) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="color"
                value={theme.colors[key]}
                onChange={(e) => updateColor(key, e.target.value)}
                style={{ width: 36, height: 36, border: `1px solid ${STONE_MID}`, borderRadius: 6, cursor: "pointer", padding: 0 }}
              />
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, color: TEXT_MAIN, margin: 0, textTransform: "capitalize" }}>{key}</p>
                <p style={{ fontSize: 9, color: TEXT_FAINT, margin: 0, fontFamily: "monospace" }}>{theme.colors[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Type size={14} /> Typography
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
          {TYPOGRAPHY_OPTIONS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme((prev) => ({ ...prev, typography: t.key }))}
              style={{
                padding: "10px 8px", borderRadius: 8, border: `2px solid ${theme.typography === t.key ? BRASS : STONE_MID}`,
                background: theme.typography === t.key ? "rgba(196,171,112,0.1)" : "transparent",
                cursor: "pointer", textAlign: "center",
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: TEXT_MAIN, margin: "0 0 2px" }}>{t.label}</p>
              <p style={{ fontSize: 9, color: TEXT_FAINT, margin: 0 }}>{t.sample}</p>
              {theme.typography === t.key && <Check size={12} style={{ color: BRASS, marginTop: 4 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Theme"}
        </Button>
        {saved && (
          <p style={{ fontSize: 11, color: "#4A7C59", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={14} /> Theme saved! Refresh the page to see changes.
          </p>
        )}
      </div>
    </div>
  );
}
