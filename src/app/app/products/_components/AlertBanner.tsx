"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { StockAlert } from "@/lib/types";

interface AlertBannerProps {
  alerts: StockAlert[];
  productNames: Record<string, string>;
}

export function AlertBanner({ alerts, productNames }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  return (
    <div style={{
      background: "rgba(139,58,58,0.12)",
      border: "1px solid rgba(139,58,58,0.35)",
      borderRadius: "10px",
      padding: "12px 16px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    }}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-garnet, #8B3A3A)" }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-garnet, #8B3A3A)", marginBottom: "4px" }}>
          {alerts.length} item{alerts.length !== 1 ? "s" : ""} need attention
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <span style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "20px",
                background: "rgba(139,58,58,0.15)",
                color: "var(--color-garnet, #8B3A3A)",
                border: "1px solid rgba(139,58,58,0.25)",
              }}>
                {productNames[alert.productId] ?? alert.productId} — {alert.alertType === "out_of_stock" ? "Out of stock" : "Low stock"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
      >
        <X className="w-4 h-4" style={{ color: "var(--text-on-stone-faint)" }} />
      </button>
    </div>
  );
}
