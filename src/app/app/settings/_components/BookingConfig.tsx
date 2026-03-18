"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ServiceType } from "@/lib/types";

type WorkingHours = Record<string, { start: string; end: string; closed: boolean }>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const BUFFER_OPTIONS = [
  { value: 0, label: "None" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
];

const WINDOW_OPTIONS = [
  { value: 14, label: "2 weeks" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

type Props = {
  workspaceId: string;
  initialBookingWindow: number;
  initialBufferMinutes: number;
  initialWorkingHours: WorkingHours;
};

export function BookingConfig({ workspaceId, initialBookingWindow, initialBufferMinutes, initialWorkingHours }: Props) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingWindow, setBookingWindow] = useState(initialBookingWindow || 60);
  const [bufferMinutes, setBufferMinutes] = useState(initialBufferMinutes || 0);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(() => {
    const defaults: WorkingHours = {};
    DAYS.forEach(day => {
      defaults[day] = initialWorkingHours?.[day] || {
        start: day === "sunday" || day === "saturday" ? "10:00" : "09:00",
        end: day === "sunday" || day === "saturday" ? "16:00" : "18:00",
        closed: day === "sunday",
      };
    });
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`/api/service-types?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setServiceTypes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleBookingTypeChange(serviceId: string, bookingType: string) {
    setServiceTypes(prev =>
      prev.map(s => s.id === serviceId ? { ...s, bookingType: bookingType as "instant" | "request" } : s)
    );

    await fetch(`/api/service-types/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingType, workspaceId }),
    });
  }

  function updateDayHours(day: string, field: "start" | "end" | "closed", value: string | boolean) {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  async function saveWorkspaceSettings() {
    setSaving(true);
    setSaved(false);

    try {
      await fetch("/api/settings/booking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          bookingWindowDays: bookingWindow,
          bufferMinutes,
          workingHours,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Service booking types */}
      <div>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>
          Service Booking Types
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", marginBottom: "12px" }}>
          Instant: clients pick a time slot and book immediately. Request: clients submit preferences and you confirm.
        </p>

        {loading ? (
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>Loading services...</p>
        ) : serviceTypes.length === 0 ? (
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>
            No service types configured yet. Add them above in Service Types.
          </p>
        ) : (
          <div className="space-y-2">
            {serviceTypes.map(st => (
              <div
                key={st.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ border: "1px solid var(--stone-mid)", background: "var(--stone-card)" }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-on-stone)" }}>{st.name}</span>
                <div className="flex gap-1">
                  {(["instant", "request"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handleBookingTypeChange(st.id, type)}
                      className="px-2.5 py-1 rounded-md transition-all"
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.03em",
                        textTransform: "capitalize",
                        background: (st.bookingType || "request") === type
                          ? type === "instant" ? "var(--brass)" : "var(--garnet)"
                          : "transparent",
                        color: (st.bookingType || "request") === type
                          ? type === "instant" ? "var(--bark-deepest)" : "var(--stone-lightest)"
                          : "var(--text-on-stone-faint)",
                        border: (st.bookingType || "request") === type
                          ? "none"
                          : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking window */}
      <div>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>
          Booking Window
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", marginBottom: "8px" }}>
          How far in advance clients can book
        </p>
        <div className="flex gap-2">
          {WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setBookingWindow(opt.value)}
              className="px-3 py-2 rounded-lg transition-all"
              style={{
                fontSize: "12px",
                background: bookingWindow === opt.value ? "var(--brass)" : "rgba(0,0,0,0.04)",
                color: bookingWindow === opt.value ? "var(--bark-deepest)" : "var(--text-on-stone-dim)",
                border: bookingWindow === opt.value ? "1px solid var(--brass-warm)" : "1px solid var(--stone-mid)",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buffer time */}
      <div>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>
          Buffer Between Appointments
        </p>
        <div className="flex gap-2 flex-wrap">
          {BUFFER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setBufferMinutes(opt.value)}
              className="px-3 py-2 rounded-lg transition-all"
              style={{
                fontSize: "12px",
                background: bufferMinutes === opt.value ? "var(--brass)" : "rgba(0,0,0,0.04)",
                color: bufferMinutes === opt.value ? "var(--bark-deepest)" : "var(--text-on-stone-dim)",
                border: bufferMinutes === opt.value ? "1px solid var(--brass-warm)" : "1px solid var(--stone-mid)",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div>
        <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>
          Working Hours
        </p>
        <div className="space-y-2">
          {DAYS.map(day => {
            const hours = workingHours[day];
            return (
              <div
                key={day}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ border: "1px solid var(--stone-mid)", background: "var(--stone-card)" }}
              >
                <span style={{ width: "36px", fontSize: "12px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                  {DAY_LABELS[day]}
                </span>
                {hours.closed ? (
                  <span style={{ flex: 1, fontSize: "12px", color: "var(--text-on-stone-ghost)", fontStyle: "italic" }}>
                    Closed
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={hours.start}
                      onChange={e => updateDayHours(day, "start", e.target.value)}
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid var(--stone-mid)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "11px",
                        color: "var(--text-on-stone)",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "10px", color: "var(--text-on-stone-ghost)" }}>to</span>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={e => updateDayHours(day, "end", e.target.value)}
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid var(--stone-mid)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "11px",
                        color: "var(--text-on-stone)",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
                <button
                  onClick={() => updateDayHours(day, "closed", !hours.closed)}
                  className="px-2 py-1 rounded-md"
                  style={{
                    fontSize: "10px",
                    background: hours.closed ? "var(--garnet-wash)" : "transparent",
                    color: hours.closed ? "var(--garnet)" : "var(--text-on-stone-ghost)",
                    border: "1px solid " + (hours.closed ? "var(--garnet-wash)" : "var(--stone-mid)"),
                    cursor: "pointer",
                  }}
                >
                  {hours.closed ? "Closed" : "Open"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <Button onClick={saveWorkspaceSettings} disabled={saving} size="md">
        {saving ? "Saving..." : saved ? "Saved!" : "Save Booking Settings"}
      </Button>
    </div>
  );
}
