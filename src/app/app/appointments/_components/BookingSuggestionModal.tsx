"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

type RebookRequest = {
  id: string;
  client_id: string;
  service_type: string | null;
  preferred_dates: string[];
  notes: string | null;
  status: string;
  created_at: string;
};

type SuggestedSlot = {
  date: string;
  startTime: string;
  endTime: string;
  dayName: string;
  score: number;
};

type Props = {
  request: RebookRequest;
  clientName: string;
  workspaceId: string;
  onClose: () => void;
  onBooked: () => void;
};

function parseNotes(notesStr: string | null): {
  preferredTime?: string;
  timeframe?: string;
  clientNotes?: string;
} {
  if (!notesStr) return {};
  try {
    return JSON.parse(notesStr);
  } catch {
    return { clientNotes: notesStr };
  }
}

function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatSlotDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function BookingSuggestionModal({
  request,
  clientName,
  workspaceId,
  onClose,
  onBooked,
}: Props) {
  const [slots, setSlots] = useState<SuggestedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SuggestedSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [serviceDuration, setServiceDuration] = useState(60);

  const notes = parseNotes(request.notes);

  // Look up the service type's configured duration
  useEffect(() => {
    fetch(`/api/service-types?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then((types: Array<{ name: string; defaultDurationMins?: number }>) => {
        const match = types.find(t => t.name === request.service_type);
        if (match?.defaultDurationMins) setServiceDuration(match.defaultDurationMins);
      })
      .catch(() => {});
  }, [workspaceId, request.service_type]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/suggest-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          preferredDays: request.preferred_dates,
          preferredTime: notes.preferredTime || "morning",
          timeframe: notes.timeframe || "2_weeks",
          durationMins: serviceDuration,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError(`Could not load suggested times: ${err instanceof Error ? err.message : "Unknown error"}. workspaceId=${workspaceId}`);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, request.preferred_dates, notes.preferredTime, notes.timeframe, serviceDuration]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  async function handleConfirmBooking() {
    if (!selectedSlot) return;
    setBooking(true);

    try {
      // Use raw local time string — no UTC conversion
      const startAt = `${selectedSlot.date}T${selectedSlot.startTime}:00`;

      // Create the appointment as pending_confirmation (client must confirm)
      const apptRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: request.client_id,
          serviceName: request.service_type || "Service",
          startAt,
          durationMins: serviceDuration,
          notes: notes.clientNotes || undefined,
          workspaceId,
          status: "pending_confirmation",
        }),
      });

      if (!apptRes.ok) throw new Error("Failed to create appointment");

      // Mark the rebook request as confirmed
      await fetch(`/api/appointments/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      onBooked();
    } catch {
      setError("Failed to book appointment. Please try again.");
      setBooking(false);
    }
  }

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "85vh",
          overflowY: "auto",
          margin: "16px",
          borderRadius: "12px",
          background: "var(--bark-deepest, #2C2C2A)",
          border: "1px solid var(--bark-medium, #4A4A46)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--bark-medium, #4A4A46)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "var(--text-on-bark, #F5F0E8)",
                  margin: 0,
                }}
              >
                Book {clientName}
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--text-on-bark-faint, #9A9A92)",
                  marginTop: "4px",
                }}
              >
                {request.service_type || "Service"}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-on-bark-faint, #9A9A92)",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px",
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 24px 24px" }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--brass, #C4AB70)",
              marginBottom: "12px",
              fontWeight: 500,
            }}
          >
            Suggested Times
          </p>

          {loading && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid var(--bark-medium, #4A4A46)",
                  borderTopColor: "var(--brass, #C4AB70)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 8px",
                }}
              />
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--text-on-bark-faint, #9A9A92)",
                }}
              >
                Finding available times...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: "rgba(196,78,78,0.12)",
                border: "1px solid rgba(196,78,78,0.3)",
                marginBottom: "12px",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#E8A0A0",
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          {!loading && !error && slots.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-on-bark-faint, #9A9A92)",
                }}
              >
                No available slots found for these preferences.
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "var(--text-on-bark-ghost, #6A6A62)",
                  marginTop: "4px",
                }}
              >
                Try expanding the timeframe or adjusting preferences.
              </p>
            </div>
          )}

          {!loading && slots.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {slots.map((slot) => {
                const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={`${slot.date}-${slot.startTime}`}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--brass, #C4AB70)"
                        : "1px solid var(--stone-warm, #D4C9B5)",
                      background: isSelected
                        ? "var(--stone, #F5F0E8)"
                        : "var(--stone-card, #FAF8F3)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-on-stone, #2C2C2A)",
                        margin: 0,
                      }}
                    >
                      {slot.dayName}, {formatSlotDate(slot.date)}
                    </p>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "12px",
                        color: isSelected
                          ? "var(--garnet, #4A1A2E)"
                          : "var(--text-on-stone-faint, #7A7A72)",
                        marginTop: "2px",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {formatSlotTime(slot.startTime)} &ndash; {formatSlotTime(slot.endTime)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {!loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {slots.length > 0 && (
                <Button
                  size="md"
                  disabled={!selectedSlot || booking}
                  onClick={handleConfirmBooking}
                  style={{ width: "100%" }}
                >
                  {booking ? "Booking..." : "Confirm Booking"}
                </Button>
              )}
              <a
                href={`/app/appointments/new?clientId=${request.client_id}&service=${encodeURIComponent(request.service_type || "")}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--stone-warm, #D4C9B5)",
                  background: "var(--stone-card, #FAF8F3)",
                  color: "var(--text-on-stone, #2C2C2A)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Book Manually
              </a>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-on-bark-faint, #9A9A92)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
