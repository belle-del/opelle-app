"use client";

import { useState } from "react";
import type { AvailabilityPattern } from "@/lib/types";

const DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

type DayState = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  patternId?: string;
  saving: boolean;
  error?: string;
};

type Props = {
  workspaceId: string;
  userId: string;
  initialPatterns: AvailabilityPattern[];
};

function buildInitialState(initialPatterns: AvailabilityPattern[]): Record<number, DayState> {
  const byDay: Record<number, AvailabilityPattern> = {};
  for (const p of initialPatterns) byDay[p.dayOfWeek] = p;

  const state: Record<number, DayState> = {};
  for (const d of DAYS) {
    const p = byDay[d.value];
    state[d.value] = {
      enabled: !!p,
      startTime: p?.startTime.slice(0, 5) ?? "09:00",
      endTime: p?.endTime.slice(0, 5) ?? "18:00",
      breakStart: p?.breakStart?.slice(0, 5) ?? "",
      breakEnd: p?.breakEnd?.slice(0, 5) ?? "",
      patternId: p?.id,
      saving: false,
    };
  }
  return state;
}

export function WeeklyScheduleEditor({ workspaceId: _workspaceId, userId, initialPatterns }: Props) {
  const [days, setDays] = useState<Record<number, DayState>>(() => buildInitialState(initialPatterns));

  function update(dayOfWeek: number, patch: Partial<DayState>) {
    setDays(prev => ({ ...prev, [dayOfWeek]: { ...prev[dayOfWeek], ...patch } }));
  }

  async function saveDay(dayOfWeek: number) {
    const day = days[dayOfWeek];

    if (!day.enabled) {
      if (day.patternId) {
        update(dayOfWeek, { saving: true, error: undefined });
        const res = await fetch(`/api/booking/availability/patterns/${day.patternId}`, { method: "DELETE" });
        if (res.ok) {
          update(dayOfWeek, { saving: false, patternId: undefined });
        } else {
          update(dayOfWeek, { saving: false, error: "Failed to remove" });
        }
      }
      return;
    }

    update(dayOfWeek, { saving: true, error: undefined });
    const res = await fetch("/api/booking/availability/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        dayOfWeek,
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart || null,
        breakEnd: day.breakEnd || null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      update(dayOfWeek, { saving: false, patternId: data.pattern.id });
    } else {
      update(dayOfWeek, { saving: false, error: "Failed to save" });
    }
  }

  return (
    <div style={{ background: "var(--cream, #FAF8F5)", borderRadius: 12, border: "1px solid var(--stone-200, #e0ddd6)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stone-200, #e0ddd6)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)" }}>
          Weekly Schedule
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint, #8a8880)", marginTop: 2 }}>
          Set your recurring availability. Changes save on blur.
        </p>
      </div>

      {DAYS.map(({ label, value }) => {
        const day = days[value];
        return (
          <div
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderBottom: "1px solid var(--stone-100, #f0ede8)",
              background: day.enabled ? "white" : "transparent",
              opacity: day.saving ? 0.7 : 1,
              flexWrap: "wrap",
            }}
          >
            {/* Day toggle */}
            <div style={{ width: 110, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  update(value, { enabled: !day.enabled });
                  // save after state update is flushed
                  setTimeout(() => saveDay(value), 0);
                }}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: day.enabled ? "var(--garnet, #8B3A3A)" : "var(--stone-300, #ccc)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
                aria-label={`Toggle ${label}`}
              >
                <span style={{
                  position: "absolute",
                  top: 2,
                  left: day.enabled ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "white",
                  transition: "left 0.2s",
                  display: "block",
                }} />
              </button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: day.enabled ? "var(--text-on-stone, #2C2C2A)" : "var(--text-on-stone-faint, #8a8880)" }}>
                {label}
              </span>
            </div>

            {day.enabled && (
              <>
                <input
                  type="time"
                  value={day.startTime}
                  onChange={e => update(value, { startTime: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "4px 8px" }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)" }}>to</span>
                <input
                  type="time"
                  value={day.endTime}
                  onChange={e => update(value, { endTime: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "4px 8px" }}
                />

                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)", marginLeft: 8 }}>Break:</span>
                <input
                  type="time"
                  value={day.breakStart}
                  onChange={e => update(value, { breakStart: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "4px 8px", width: 100 }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-on-stone-faint)" }}>–</span>
                <input
                  type="time"
                  value={day.breakEnd}
                  onChange={e => update(value, { breakEnd: e.target.value })}
                  onBlur={() => saveDay(value)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, border: "1px solid var(--stone-200, #e0ddd6)", borderRadius: 6, padding: "4px 8px", width: 100 }}
                />
              </>
            )}

            {day.error && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--garnet, #8B3A3A)" }}>{day.error}</span>
            )}
            {day.saving && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-on-stone-faint)" }}>Saving…</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
