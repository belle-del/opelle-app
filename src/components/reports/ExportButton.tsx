"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  reportType: string;
  startDate: string;
  endDate: string;
  extraParams?: Record<string, string>;
}

export function ExportButton({ reportType, startDate, endDate, extraParams }: ExportButtonProps) {
  const handleExport = () => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      format: "csv",
      ...extraParams,
    });
    window.open(`/api/reports/${reportType}?${params.toString()}`, "_blank");
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5"
      style={{
        padding: "5px 10px",
        borderRadius: "4px",
        fontSize: "10px",
        border: "1px solid var(--stone-mid)",
        background: "transparent",
        color: "var(--text-on-stone)",
        cursor: "pointer",
      }}
    >
      <Download style={{ width: "12px", height: "12px" }} />
      Export CSV
    </button>
  );
}
