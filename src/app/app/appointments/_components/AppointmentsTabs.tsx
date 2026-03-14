"use client";

import { useState, type ReactNode } from "react";

type Props = {
  pendingRequestsCount: number;
  children: {
    calendar: ReactNode;
    requests: ReactNode;
  };
};

export function AppointmentsTabs({ pendingRequestsCount, children }: Props) {
  const [tab, setTab] = useState<"calendar" | "requests">("calendar");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid var(--brass-line)" }}>
        <button
          onClick={() => setTab("calendar")}
          className="px-4 py-2 transition-all"
          style={{
            background: "none",
            border: "none",
            borderBottom: tab === "calendar" ? "2px solid var(--brass)" : "2px solid transparent",
            color: tab === "calendar" ? "var(--text-on-bark)" : "var(--text-on-bark-faint)",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.03em",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Calendar
        </button>
        <button
          onClick={() => setTab("requests")}
          className="px-4 py-2 transition-all flex items-center gap-1.5"
          style={{
            background: "none",
            border: "none",
            borderBottom: tab === "requests" ? "2px solid var(--brass)" : "2px solid transparent",
            color: tab === "requests" ? "var(--text-on-bark)" : "var(--text-on-bark-faint)",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.03em",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Requests
          {pendingRequestsCount > 0 && (
            <span
              className="inline-flex items-center justify-center"
              style={{
                background: "var(--garnet)",
                color: "var(--stone-lightest)",
                fontSize: "9px",
                fontWeight: 600,
                borderRadius: "100px",
                minWidth: "16px",
                height: "16px",
                padding: "0 4px",
              }}
            >
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === "calendar" && children.calendar}
      {tab === "requests" && children.requests}
    </div>
  );
}
