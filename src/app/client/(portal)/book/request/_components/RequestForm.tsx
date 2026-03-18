"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DAY_OPTIONS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const TIME_OPTIONS = [
  { value: "morning", label: "Morning", sub: "Before noon" },
  { value: "afternoon", label: "Afternoon", sub: "12 — 5 PM" },
  { value: "evening", label: "Evening", sub: "After 5 PM" },
];

const TIMEFRAME_OPTIONS = [
  { value: "2_weeks", label: "Within 2 weeks" },
  { value: "1_month", label: "Within a month" },
  { value: "flexible", label: "Flexible" },
];

type Props = {
  clientId: string;
  workspaceId: string;
};

export function RequestForm({ clientId, workspaceId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceName = searchParams.get("serviceName") || "Service";

  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/client/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: decodeURIComponent(serviceName),
          preferredDays: selectedDays,
          preferredTime,
          timeframe,
          notes: notes.trim() || null,
          clientId,
          workspaceId,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || `Request failed (${res.status})`);
        console.error("[RequestForm] Submit failed:", res.status, errBody);
      }
    } catch (err) {
      setError("Network error — please try again");
      console.error("[RequestForm] Network error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
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
            Request Sent
          </h2>
          <p style={{ fontSize: "14px", color: "var(--stone-shadow)" }}>
            Your stylist will review your preferences and get back to you soon.
          </p>
        </div>
        <Button onClick={() => router.push("/client")} className="w-full" size="lg">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => step === 1 ? router.push("/client/book") : setStep(step - 1)}
        style={{ color: "var(--brass)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        {step === 1 ? "Back to services" : "Back"}
      </button>

      <div>
        <h1
          className="text-xl"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
        >
          Request Booking
        </h1>
        <p style={{ fontSize: "13px", color: "var(--stone-shadow)", marginTop: "2px" }}>
          {decodeURIComponent(serviceName)}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className="h-1 rounded-full flex-1"
            style={{
              background: s <= step ? "var(--brass)" : "rgba(196,171,112,0.2)",
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(117,18,18,0.1)", border: "1px solid rgba(117,18,18,0.2)" }}>
          <p style={{ fontSize: "12px", color: "var(--status-low)", fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* Step 1: Preferred window */}
      {step === 1 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="py-4 space-y-4">
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500, marginBottom: "8px" }}>
                  Preferred days
                </p>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className="px-3 py-2.5 rounded-lg transition-all min-w-[44px]"
                      style={{
                        fontSize: "13px",
                        background: selectedDays.includes(day.value) ? "var(--brass)" : "rgba(0,0,0,0.04)",
                        color: selectedDays.includes(day.value) ? "var(--bark-deepest)" : "var(--text-on-stone-dim)",
                        border: selectedDays.includes(day.value) ? "1px solid var(--brass-warm)" : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500, marginBottom: "8px" }}>
                  Preferred time of day
                </p>
                <div className="space-y-2">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPreferredTime(opt.value)}
                      className="w-full text-left px-3 py-3 rounded-lg transition-all flex justify-between items-center"
                      style={{
                        background: preferredTime === opt.value ? "var(--brass)" : "rgba(0,0,0,0.04)",
                        color: preferredTime === opt.value ? "var(--bark-deepest)" : "var(--text-on-stone-dim)",
                        border: preferredTime === opt.value ? "1px solid var(--brass-warm)" : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>{opt.label}</span>
                      <span style={{ fontSize: "11px", opacity: 0.7 }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500, marginBottom: "8px" }}>
                  General timeframe
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTimeframe(opt.value)}
                      className="px-3 py-2.5 rounded-lg transition-all"
                      style={{
                        fontSize: "13px",
                        background: timeframe === opt.value ? "var(--brass)" : "rgba(0,0,0,0.04)",
                        color: timeframe === opt.value ? "var(--bark-deepest)" : "var(--text-on-stone-dim)",
                        border: timeframe === opt.value ? "1px solid var(--brass-warm)" : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setStep(2)}
            className="w-full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Notes */}
      {step === 2 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="py-4">
              <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500, marginBottom: "8px" }}>
                Anything your stylist should know?
              </p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional — any details about what you're looking for"
                rows={4}
              />
            </CardContent>
          </Card>

          <Button
            onClick={() => setStep(3)}
            className="w-full"
            size="lg"
          >
            Review Request
          </Button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="py-4 space-y-3">
              <div>
                <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</p>
                <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>{decodeURIComponent(serviceName)}</p>
              </div>
              {selectedDays.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preferred Days</p>
                  <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
                    {selectedDays.map(d => DAY_OPTIONS.find(o => o.value === d)?.label).join(", ")}
                  </p>
                </div>
              )}
              {preferredTime && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time of Day</p>
                  <p style={{ fontSize: "14px", color: "var(--text-on-stone)", textTransform: "capitalize" }}>{preferredTime}</p>
                </div>
              )}
              {timeframe && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeframe</p>
                  <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
                    {TIMEFRAME_OPTIONS.find(o => o.value === timeframe)?.label}
                  </p>
                </div>
              )}
              {notes.trim() && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                  <p style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      )}
    </div>
  );
}
