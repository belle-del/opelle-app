"use client";

import { useDataHealth } from "@/components/useDataHealth";

export default function DbStatusBanner() {
  const { data, loading } = useDataHealth();
  const mode = data.mode ?? null;

  if (loading) return null;

  if (mode === "db" && data.ok && data.dbProbeOk) {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-200">
        DB Connected
      </div>
    );
  }

  if (mode !== "db") {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
        Demo mode — using local browser data.
      </div>
    );
  }

  const errorText = data.error || data.dbProbeDetails || "Unknown error";
  return (
    <div className="border-b border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-200">
      DB ERROR: {errorText}
    </div>
  );
}
