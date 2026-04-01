"use client";

import { useState } from "react";
import type { AutomationRule } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AutomationBuilder } from "./AutomationBuilder";

const TRIGGER_LABELS: Record<string, string> = {
  appointment_booked: "Appointment Booked",
  service_completed: "Service Completed",
  days_since_visit: "Days Since Visit",
  client_birthday: "Client Birthday",
};

export function AutomationList({
  automations,
  onUpdate,
  onCreated,
  onDeleted,
}: {
  automations: AutomationRule[];
  onUpdate: (rule: AutomationRule) => void;
  onCreated: (rule: AutomationRule) => void;
  onDeleted: (id: string) => void;
}) {
  const [showBuilder, setShowBuilder] = useState(false);

  async function handleToggle(rule: AutomationRule) {
    const res = await fetch(`/api/marketing/automations/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate(data.rule);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    const res = await fetch(`/api/marketing/automations/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <button
          onClick={() => setShowBuilder(true)}
          style={{
            padding: "8px 14px", borderRadius: "6px",
            background: "#440606", border: "1px solid #5C0B0B",
            color: "#F1EFE0", fontSize: "11px", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          + New Automation
        </button>
      </div>

      {automations.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: "#8A8778", fontSize: "13px" }}>
          No automations yet. Create one to automatically send messages on triggers.
        </div>
      )}

      {automations.map((rule) => (
        <Card key={rule.id}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", color: "#2C2C24", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  {rule.name}
                </p>
                <p style={{ fontSize: "11px", color: "#8A8778", marginTop: "2px" }}>
                  Trigger: {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                  {rule.delayMinutes > 0 && ` · ${rule.delayMinutes}min delay`}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => handleToggle(rule)}
                  style={{
                    width: "36px", height: "20px", borderRadius: "10px",
                    border: "none", cursor: "pointer",
                    background: rule.active ? "#C4AB70" : "#D4D0C8",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "2px",
                    left: rule.active ? "18px" : "2px",
                    width: "16px", height: "16px",
                    borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", display: "block",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }} />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  style={{ background: "none", border: "none", color: "#C47A7A", fontSize: "11px", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {showBuilder && (
        <AutomationBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={(rule) => { onCreated(rule); setShowBuilder(false); }}
        />
      )}
    </div>
  );
}
