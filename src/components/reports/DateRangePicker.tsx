"use client";

import { useState } from "react";

type Preset = "7d" | "30d" | "90d" | "custom";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<Preset>("30d");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const now = new Date();
    const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
    const start = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    onChange(start, end);
  };

  const presets: { key: Preset; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          style={{
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "10px",
            letterSpacing: "0.05em",
            border: "1px solid var(--stone-mid)",
            background: preset === p.key ? "var(--stone-mid)" : "transparent",
            color: "var(--text-on-stone)",
            cursor: "pointer",
          }}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            style={{
              padding: "3px 6px",
              borderRadius: "4px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              fontSize: "10px",
            }}
          />
          <span style={{ color: "var(--text-on-stone-faint)", fontSize: "10px" }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange(startDate, e.target.value)}
            style={{
              padding: "3px 6px",
              borderRadius: "4px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              fontSize: "10px",
            }}
          />
        </div>
      )}
    </div>
  );
}
