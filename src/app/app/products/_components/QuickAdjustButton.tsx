"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface QuickAdjustButtonProps {
  productId: string;
  productName: string;
  currentStock: number;
}

const REASON_OPTIONS = [
  { value: "manual_adjust", label: "Count adjustment" },
  { value: "received", label: "Received stock" },
  { value: "waste", label: "Waste / damaged" },
  { value: "return", label: "Return" },
];

export function QuickAdjustButton({ productId, productName, currentStock }: QuickAdjustButtonProps) {
  const [open, setOpen] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("manual_adjust");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adj = parseFloat(adjustment) || 0;
  const preview = Math.max(0, currentStock + adj);

  async function submit() {
    if (!adjustment || adj === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, adjustment: adj, reason, notes }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          setOpen(false);
          setDone(false);
          setAdjustment("");
          setNotes("");
          window.location.reload();
        }, 800);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to save adjustment. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
        title="Quick adjust"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-ghost)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "var(--card-bg-solid, #2C2820)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "380px",
              margin: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
                  Adjust Stock
                </p>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "16px", color: "var(--text-on-stone)", fontWeight: 400 }}>
                  {productName}
                </h3>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X className="w-4 h-4" style={{ color: "var(--text-on-stone-faint)" }} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>Current</p>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text-on-stone)" }}>{currentStock}</p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>After</p>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: adj < 0 ? "var(--color-garnet, #8B3A3A)" : "var(--brass, #C4AB70)" }}>
                  {preview}
                </p>
              </div>
            </div>

            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Adjustment (+/-)
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => { setAdjustment(e.target.value); setError(null); }}
              placeholder="-3 or +10"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-on-stone)",
                fontSize: "14px", marginBottom: "12px", boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "var(--card-bg-solid, #2C2820)",
                color: "var(--text-on-stone)",
                fontSize: "13px", marginBottom: "12px", boxSizing: "border-box",
              }}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <label style={{ display: "block", fontSize: "10px", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. physical count, expired product"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-on-stone)",
                fontSize: "13px", marginBottom: "20px", boxSizing: "border-box",
              }}
            />

            {error && (
              <p style={{ fontSize: "11px", color: "var(--color-garnet, #8B3A3A)", marginBottom: "12px" }}>
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={loading || !adjustment || adj === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                background: done ? "#4A7C59" : "var(--color-garnet, #8B3A3A)",
                color: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading || !adjustment || adj === 0 ? 0.5 : 1,
                transition: "background 0.2s",
              }}
            >
              {done ? "Updated!" : loading ? "Saving..." : "Confirm Adjustment"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
