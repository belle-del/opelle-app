"use client";

import { useState } from "react";
import type { AutomationRule } from "@/lib/types";

const TRIGGERS = [
  { value: "service_completed", label: "After Service Completed" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "days_since_visit", label: "Days Since Last Visit" },
  { value: "client_birthday", label: "Client Birthday" },
];

export function AutomationBuilder({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (rule: AutomationRule) => void;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("service_completed");
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, delayMinutes }),
      });
      const data = await res.json();
      if (data.rule) onCreated(data.rule);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "420px", maxWidth: "90vw", background: "#FAFAF5", borderRadius: "12px",
        padding: "24px", zIndex: 101, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "#2C2C24", fontWeight: 300, marginBottom: "16px" }}>
          New Automation
        </h3>

        <label style={{ display: "block", fontSize: "12px", color: "#5C5A4F", marginBottom: "4px" }}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Thank you after service"
          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "13px", marginBottom: "12px" }}
        />

        <label style={{ display: "block", fontSize: "12px", color: "#5C5A4F", marginBottom: "4px" }}>Trigger</label>
        <select
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "13px", marginBottom: "12px", background: "#fff" }}
        >
          {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <label style={{ display: "block", fontSize: "12px", color: "#5C5A4F", marginBottom: "4px" }}>Delay (minutes)</label>
        <input
          type="number"
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(parseInt(e.target.value, 10) || 0)}
          min={0}
          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "13px", marginBottom: "20px" }}
        />

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontSize: "12px", cursor: "pointer", color: "#5C5A4F" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{
            padding: "8px 16px", borderRadius: "6px", border: "none",
            background: "#440606", color: "#F1EFE0", fontSize: "12px", cursor: "pointer",
            opacity: saving || !name.trim() ? 0.6 : 1,
          }}>
            {saving ? "Creating..." : "Create Automation"}
          </button>
        </div>
      </div>
    </>
  );
}
