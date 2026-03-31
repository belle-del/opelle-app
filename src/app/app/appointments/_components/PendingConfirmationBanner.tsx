"use client";

import { useState, useEffect } from "react";

type PendingAppointment = {
  id: string;
  clientName: string;
  serviceName: string;
  startAt: string;
};

type Props = {
  pending: PendingAppointment[];
};

export function PendingConfirmationBanner({ pending }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<PendingAppointment[]>(pending);

  // Sync if parent re-renders with updated pending list (e.g. after external confirmation)
  useEffect(() => {
    setLocalPending(pending);
  }, [pending]);

  if (dismissed || localPending.length === 0) return null;

  async function handleAction(id: string, action: "confirm" | "cancel") {
    setActioning(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "confirm" ? "scheduled" : "cancelled" }),
    });
    setActioning(null);
    if (res.ok) {
      setLocalPending(prev => prev.filter(p => p.id !== id));
    }
  }

  return (
    <div style={{ background: "var(--garnet-deep, #5C1F1F)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--garnet-blush, #F5E6E6)", marginBottom: 8, marginTop: 0 }}>
            {localPending.length} booking request{localPending.length !== 1 ? "s" : ""} awaiting confirmation
          </p>
          {localPending.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet-blush, #F5E6E6)" }}>
                {p.clientName} — {p.serviceName}
                {" "}
                ({new Date(p.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })})
              </span>
              <button
                type="button"
                onClick={() => handleAction(p.id, "confirm")}
                disabled={actioning === p.id}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  background: "white",
                  color: "var(--garnet, #8B3A3A)",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 10px",
                  cursor: actioning === p.id ? "not-allowed" : "pointer",
                  opacity: actioning === p.id ? 0.6 : 1,
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => handleAction(p.id, "cancel")}
                disabled={actioning === p.id}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  background: "transparent",
                  color: "var(--garnet-blush, #F5E6E6)",
                  border: "1px solid var(--garnet-blush, #F5E6E6)",
                  borderRadius: 4,
                  padding: "3px 10px",
                  cursor: actioning === p.id ? "not-allowed" : "pointer",
                  opacity: actioning === p.id ? 0.6 : 1,
                }}
              >
                Decline
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{ background: "none", border: "none", color: "var(--garnet-blush, #F5E6E6)", cursor: "pointer", fontSize: 18, lineHeight: 1, paddingLeft: 12, flexShrink: 0 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
