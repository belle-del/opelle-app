"use client";

import { useState } from "react";
import type { AvailabilityOverride } from "@/lib/types";

type Props = {
  workspaceId: string;
  userId: string;
  initialOverrides: AvailabilityOverride[];
};

export function OverridesPanel({ workspaceId: _workspaceId, userId, initialOverrides }: Props) {
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>(initialOverrides);
  const [date, setDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!date) { setError("Date is required"); return; }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/booking/availability/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        overrideDate: date,
        isAvailable,
        startTime: isAvailable ? startTime : null,
        endTime: isAvailable ? endTime : null,
        notes: notes || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setOverrides(prev =>
        [...prev.filter(o => o.overrideDate !== date), data.override]
          .sort((a, b) => a.overrideDate.localeCompare(b.overrideDate))
      );
      setDate("");
      setNotes("");
    } else {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error || "Failed to save override");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/booking/availability/overrides?id=${id}`, { method: "DELETE" });
    if (res.ok) setOverrides(prev => prev.filter(o => o.id !== id));
  }

  return (
    <div style={{ background: "var(--cream, #FAF8F5)", borderRadius: 12, border: "1px solid var(--stone-200, #e0ddd6)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-200, #e0ddd6)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)" }}>
          Date Overrides
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint, #8a8880)", marginTop: 2 }}>
          Block out specific dates or set custom hours for a day.
        </p>
      </div>

      {/* Existing overrides */}
      {overrides.length > 0 && (
        <div style={{ padding: "8px 20px" }}>
          {overrides.map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--stone-100, #f0ede8)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-on-stone, #2C2C2A)" }}>{o.overrideDate}</span>
                {o.isAvailable ? (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)" }}>
                    {o.startTime?.slice(0, 5)} – {o.endTime?.slice(0, 5)}
                  </span>
                ) : (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet, #8B3A3A)" }}>Blocked</span>
                )}
                {o.notes && (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)" }}>{o.notes}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(o.id)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--garnet, #8B3A3A)", border: "none", background: "none", cursor: "pointer", padding: "2px 6px" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add override form */}
      <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "6px 10px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Type</label>
          <select
            value={isAvailable ? "available" : "blocked"}
            onChange={e => setIsAvailable(e.target.value === "available")}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "6px 10px" }}
          >
            <option value="blocked">Blocked (day off)</option>
            <option value="available">Available (custom hours)</option>
          </select>
        </div>

        {isAvailable && (
          <>
            <div>
              <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>From</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "6px 10px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>To</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "6px 10px" }}
              />
            </div>
          </>
        )}

        <div>
          <label style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)", marginBottom: 4 }}>Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Holiday"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "6px 10px", width: 160 }}
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--garnet, #8B3A3A)",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Add Override"}
        </button>

        {error && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--garnet, #8B3A3A)", margin: 0 }}>{error}</p>
        )}
      </div>
    </div>
  );
}
