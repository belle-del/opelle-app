"use client";

import type { MessageLog as MessageLogType } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  automation: "Automation",
  campaign: "Campaign",
  cron: "Scheduled",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "#7CB87A",
  delivered: "#8FADC8",
  failed: "#C47A7A",
  opened: "#C4AB70",
  clicked: "#9B7FE8",
};

export function MessageLog({ logs }: { logs: MessageLogType[] }) {
  if (logs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px", color: "#8A8778", fontSize: "13px" }}>
        No messages sent yet. Send a message or create an automation to get started.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "90px 1fr 80px 70px 120px",
        gap: "8px", padding: "8px 12px", fontSize: "9px", color: "#9A9485",
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <span>Source</span>
        <span>Body</span>
        <span>Channel</span>
        <span>Status</span>
        <span>Sent</span>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            display: "grid", gridTemplateColumns: "90px 1fr 80px 70px 120px",
            gap: "8px", padding: "8px 12px", borderRadius: "6px",
            background: "rgba(241,239,224,0.03)",
            borderBottom: "1px solid rgba(241,239,224,0.04)",
            fontSize: "11px", alignItems: "center",
          }}
        >
          <span style={{ color: "#7A7060" }}>
            {SOURCE_LABELS[log.source] || log.source}
          </span>
          <span style={{ color: "#5C5A4F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {log.body || log.subject || "—"}
          </span>
          <span style={{ color: "#8A8778", textTransform: "uppercase", fontSize: "9px" }}>
            {log.channel}
          </span>
          <span style={{ color: STATUS_COLORS[log.status] || "#8A8778", fontSize: "10px", fontWeight: 600 }}>
            {log.status}
          </span>
          <span style={{ color: "#8A8778", fontSize: "10px" }}>
            {new Date(log.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ))}
    </div>
  );
}
