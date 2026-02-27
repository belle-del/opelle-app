"use client";

import { Search } from "lucide-react";
import type { ServiceType } from "@/lib/types";

interface FormulaSearchBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  serviceTypeId: string;
  onServiceTypeChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  serviceTypes: ServiceType[];
}

export function FormulaSearchBar({
  search, onSearchChange,
  serviceTypeId, onServiceTypeChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  serviceTypes,
}: FormulaSearchBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
      <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
        <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--text-on-stone-ghost)", pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Search formulas — bleach, level 6, RR..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            paddingLeft: "32px",
            paddingRight: "12px",
            paddingTop: "8px",
            paddingBottom: "8px",
            borderRadius: "8px",
            border: "1px solid var(--stone-mid)",
            background: "rgba(0,0,0,0.04)",
            fontSize: "13px",
            color: "var(--text-on-stone)",
            outline: "none",
          }}
        />
      </div>

      <select
        value={serviceTypeId}
        onChange={(e) => onServiceTypeChange(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
          flex: "0 0 auto",
        }}
      >
        <option value="">All service types</option>
        {serviceTypes.map((st) => (
          <option key={st.id} value={st.id}>{st.name}</option>
        ))}
      </select>

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
        }}
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid var(--stone-mid)",
          background: "rgba(0,0,0,0.04)",
          fontSize: "13px",
          color: "var(--text-on-stone)",
          outline: "none",
        }}
      />
    </div>
  );
}
