"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Slot = {
  date: string;
  time: string;
  startAt: string;
  available: boolean;
};

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SlotPickerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = searchParams.get("serviceId");
  const serviceName = searchParams.get("serviceName") || "Service";
  const duration = parseInt(searchParams.get("duration") || "60");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [booked, setBooked] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch slots for the current week view
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + weekOffset * 7);

      const promises = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        promises.push(
          fetch(`/api/client/appointments/slots?serviceId=${serviceId}&date=${dateStr}`)
            .then(r => r.json())
            .then(data => data.slots || [])
        );
      }

      const results = await Promise.all(promises);
      const allSlots = results.flat();
      setSlots(allSlots);

      // Auto-select first date with slots
      if (allSlots.length > 0 && !selectedDate) {
        setSelectedDate(allSlots[0].date);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, weekOffset, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Get unique dates from slots
  const dates = [...new Set(slots.map(s => s.date))].sort();

  // All dates in the week (even without slots)
  const weekDates: string[] = [];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  const slotsForDate = slots.filter(s => s.date === selectedDate);

  async function handleConfirm() {
    if (!selectedSlot) return;
    setConfirming(true);

    try {
      const res = await fetch("/api/client/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          serviceName: decodeURIComponent(serviceName),
          startAt: selectedSlot.startAt,
          durationMins: duration,
        }),
      });

      if (res.ok) {
        setBooked(true);
      }
    } catch {
      // silent fail
    } finally {
      setConfirming(false);
    }
  }

  if (booked) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--brass-soft)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2
            className="text-2xl mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
          >
            You&apos;re booked!
          </h2>
          <p style={{ fontSize: "14px", color: "var(--stone-shadow)", marginBottom: "4px" }}>
            {decodeURIComponent(serviceName)}
          </p>
          <p style={{ fontSize: "13px", color: "var(--stone-shadow)" }}>
            {selectedSlot && formatFullDate(selectedSlot.startAt)}
          </p>
        </div>
        <Button onClick={() => router.push("/client")} className="w-full" size="lg">
          Back to Home
        </Button>
      </div>
    );
  }

  // Confirmation view
  if (selectedSlot && !booked) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setSelectedSlot(null)}
          style={{ color: "var(--brass)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to slots
        </button>

        <h1
          className="text-xl"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
        >
          Confirm Booking
        </h1>

        <Card>
          <CardContent className="py-5 space-y-3">
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</p>
              <p style={{ fontSize: "16px", color: "var(--text-on-stone)", fontFamily: "'Fraunces', serif" }}>
                {decodeURIComponent(serviceName)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date & Time</p>
              <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
                {formatFullDate(selectedSlot.startAt)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Duration</p>
              <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
                {duration < 60 ? `${duration} minutes` : duration === 60 ? "1 hour" : `${Math.floor(duration / 60)}h ${duration % 60 ? duration % 60 + "m" : ""}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleConfirm} disabled={confirming} className="w-full" size="lg">
          {confirming ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/client/book")}
        style={{ color: "var(--brass)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to services
      </button>

      <h1
        className="text-xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        Pick a Time
      </h1>
      <p style={{ fontSize: "13px", color: "var(--stone-shadow)" }}>
        {decodeURIComponent(serviceName)}
      </p>

      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setWeekOffset(Math.max(0, weekOffset - 1)); setSelectedDate(""); }}
          disabled={weekOffset === 0}
          style={{
            background: "none",
            border: "none",
            color: weekOffset === 0 ? "var(--stone-shadow)" : "var(--brass)",
            cursor: weekOffset === 0 ? "default" : "pointer",
            padding: "8px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span style={{ fontSize: "13px", color: "var(--stone-lightest)" }}>
          {weekDates.length > 0 && (
            <>
              {new Date(weekDates[0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" — "}
              {new Date(weekDates[6] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </>
          )}
        </span>
        <button
          onClick={() => { setWeekOffset(weekOffset + 1); setSelectedDate(""); }}
          style={{
            background: "none",
            border: "none",
            color: "var(--brass)",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {weekDates.map(dateStr => {
          const d = new Date(dateStr + "T12:00:00");
          const hasSlots = dates.includes(dateStr);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => hasSlots && setSelectedDate(dateStr)}
              className="flex flex-col items-center py-2 px-2.5 rounded-lg min-w-[50px] transition-all"
              style={{
                background: isSelected ? "var(--brass)" : hasSlots ? "var(--stone-card)" : "rgba(0,0,0,0.1)",
                color: isSelected ? "var(--bark-deepest)" : hasSlots ? "var(--text-on-stone)" : "var(--stone-shadow)",
                border: "none",
                cursor: hasSlots ? "pointer" : "default",
                opacity: hasSlots ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Fraunces', serif" }}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slots */}
      {loading ? (
        <div className="py-8 text-center">
          <p style={{ color: "var(--stone-shadow)", fontSize: "13px" }}>Loading available times...</p>
        </div>
      ) : slotsForDate.length > 0 ? (
        <div className="space-y-2">
          <p style={{ fontSize: "12px", color: "var(--stone-shadow)", marginBottom: "4px" }}>
            {formatDayLabel(selectedDate)} — {slotsForDate.length} available
          </p>
          <div className="grid grid-cols-3 gap-2">
            {slotsForDate.map(slot => (
              <button
                key={slot.startAt}
                onClick={() => setSelectedSlot(slot)}
                className="py-3 rounded-lg text-center transition-all active:scale-[0.97]"
                style={{
                  background: "var(--stone-card)",
                  border: "1px solid var(--stone-mid)",
                  fontSize: "14px",
                  color: "var(--text-on-stone)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                  minHeight: "44px",
                }}
              >
                {formatTime(slot.time)}
              </button>
            ))}
          </div>
        </div>
      ) : selectedDate ? (
        <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
          <CardContent className="py-6 text-center">
            <p style={{ color: "var(--text-on-stone-faint)", fontSize: "13px" }}>
              No available times on this day
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
          <CardContent className="py-6 text-center">
            <p style={{ color: "var(--text-on-stone-faint)", fontSize: "13px" }}>
              Select a day above to see available times
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
