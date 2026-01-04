"use client";

import { useEffect, useState } from "react";

type DbHealth = {
  ok: boolean;
  mode?: string;
  error?: string;
};

export default function DbStatusBanner() {
  const [status, setStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/db/health");
        const json = (await res.json()) as DbHealth;
        if (!active) return;
        if (res.ok && json.ok) {
          setStatus("ok");
          setErrorMessage(null);
        } else {
          setStatus("error");
          setErrorMessage(json.error ?? null);
        }
      } catch (error) {
        if (!active) return;
        setStatus("error");
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
      setStatus("error");
      setErrorMessage(detail || "DB error detected.");
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

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
      Demo mode — using local browser data.
      {errorMessage ? ` (${errorMessage})` : null}
    </div>
  );
}
