"use client";

import { useEffect, useState } from "react";

type DbHealth = {
  ok: boolean;
  mode?: string | null;
  dbProbeOk?: boolean;
  dbProbeDetails?: string;
  error?: string;
};

export default function DbStatusBanner() {
  const [status, setStatus] = useState<"unknown" | "ok" | "error" | "demo">(
    "unknown"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(
    process.env.NEXT_PUBLIC_DATA_MODE ?? null
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/db/health");
        const json = (await res.json()) as DbHealth;
        if (!active) return;
        setMode(json.mode ?? null);
        if (json.mode !== "db") {
          setStatus("demo");
          setErrorMessage(null);
        } else if (res.ok && json.ok) {
          setStatus("ok");
          setErrorMessage(null);
        } else {
          setStatus("error");
          setErrorMessage(json.error ?? json.dbProbeDetails ?? null);
        }
      } catch (error) {
        if (!active) return;
        const fallbackMode = process.env.NEXT_PUBLIC_DATA_MODE ?? null;
        setMode(fallbackMode);
        setStatus(fallbackMode === "db" ? "error" : "demo");
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to reach database."
        );
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const modeValue = process.env.NEXT_PUBLIC_DATA_MODE ?? null;
      setMode(modeValue);
      if (modeValue === "db") {
        setStatus("error");
        setErrorMessage(detail || "DB error detected.");
      } else {
        setStatus("demo");
        setErrorMessage(null);
      }
    };
    window.addEventListener("opelle:db-error", handler);
    return () => window.removeEventListener("opelle:db-error", handler);
  }, []);

  if (status === "unknown") return null;

  if (status === "ok") {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-200">
        DB Connected
      </div>
    );
  }

  if (status === "demo" || mode !== "db") {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
        Demo mode — using local browser data.
      </div>
    );
  }

  return (
    <div className="border-b border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-200">
      DB ERROR: {errorMessage ?? "Unknown error"}
    </div>
  );
}
