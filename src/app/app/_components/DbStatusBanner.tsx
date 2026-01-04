"use client";

import { useDataHealth } from "@/components/useDataHealth";

export default function DbStatusBanner() {
  const { data, loading } = useDataHealth();
  const mode = data.mode ?? null;

  if (loading) return null;

  if (mode === "db" && data.ok && data.dbProbeOk) {
    return (
      <div className="border-b border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.7)] px-6 py-3 text-sm text-[hsl(var(--fg))]">
        DB Connected
      </div>
    );
  }

  if (mode !== "db") {
    return (
      <div className="border-b border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.7)] px-6 py-3 text-sm op-muted">
        Demo mode — using local browser data.
      </div>
    );
  }

  const errorText = data.error || data.dbProbeDetails || "Unknown error";
  return (
    <div className="border-b border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.7)] px-6 py-3 text-sm text-[hsl(var(--ring))]">
      DB ERROR: {errorText}
    </div>
  );
}
