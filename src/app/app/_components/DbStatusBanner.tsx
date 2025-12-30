"use client";

import { useEffect, useState } from "react";

type DbStatusBannerProps = {
  dbConfigured: boolean;
};

export default function DbStatusBanner({ dbConfigured }: DbStatusBannerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setErrorMessage(detail || "DB error detected.");
    };
    window.addEventListener("opelle:db-error", handler);
    return () => window.removeEventListener("opelle:db-error", handler);
  }, []);

  if (dbConfigured && !errorMessage) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
      DB not connected — showing local demo data.
      {errorMessage ? ` (${errorMessage})` : null}
    </div>
  );
}
