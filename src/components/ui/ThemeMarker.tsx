"use client";

import { useTheme } from "next-themes";

export default function ThemeMarker() {
  const { resolvedTheme } = useTheme();

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-4 z-50 rounded-full border border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.7)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted))]">
      Theme system active — {resolvedTheme ?? "unknown"}
    </div>
  );
}
