"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

type VisitPhoto = {
  url: string;
  photo_type: string;
};

type CompletionPhotos = {
  before_photo_url: string | null;
  after_photo_url: string | null;
};

type AppointmentRow = {
  id: string;
  service_name: string;
  start_at: string;
  end_at: string | null;
  duration_mins: number;
  status: string;
  notes: string | null;
  photos?: VisitPhoto[];
  completion_photos?: CompletionPhotos | null;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "var(--status-confirmed)", bg: "rgba(74, 124, 89, 0.1)" };
    case "scheduled":
      return { label: "Upcoming", color: "var(--brass)", bg: "var(--brass-glow)" };
    case "pending_confirmation":
      return { label: "Pending", color: "var(--garnet-blush)", bg: "rgba(158, 90, 90, 0.1)" };
    case "cancelled":
      return { label: "Cancelled", color: "var(--text-muted)", bg: "rgba(122, 122, 114, 0.1)" };
    default:
      return { label: status, color: "var(--text-muted)", bg: "rgba(122, 122, 114, 0.1)" };
  }
}

function groupByMonth(appointments: AppointmentRow[]): Record<string, AppointmentRow[]> {
  const groups: Record<string, AppointmentRow[]> = {};
  for (const appt of appointments) {
    const d = new Date(appt.start_at);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(appt);
  }
  return groups;
}

export default function HistoryPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from history API which includes before/after photos
    fetch("/api/client/history")
      .then((res) => res.json())
      .then((data) => {
        setAppointments(data.visits || []);
      })
      .catch(() => {
        // Fallback to appointments API if history not available
        fetch("/api/client/appointments")
          .then((res) => res.json())
          .then((data) => setAppointments(data.appointments || []))
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByMonth(appointments);
  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "pending_confirmation"
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  return (
    <div className="space-y-5">
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "24px",
          color: "var(--text-on-stone)",
        }}
      >
        History
      </h1>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading your appointments...</p>
          </CardContent>
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brass)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "16px",
                color: "var(--text-on-stone)",
                marginBottom: "4px",
              }}
            >
              No appointments yet
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Your appointment history will appear here after your first visit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--brass)",
                  marginBottom: "10px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Upcoming
              </p>
              <div className="space-y-3">
                {upcoming.map((appt) => {
                  const badge = getStatusBadge(appt.status);
                  return (
                    <Card key={appt.id}>
                      <CardContent style={{ padding: "16px" }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p
                              style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: "16px",
                                color: "var(--text-on-stone)",
                                marginBottom: "4px",
                              }}
                            >
                              {appt.service_name}
                            </p>
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--text-on-stone-faint)",
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {formatDate(appt.start_at)}
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {formatTime(appt.start_at)} &middot; {appt.duration_mins} min
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "20px",
                              color: badge.color,
                              background: badge.bg,
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past visits grouped by month */}
          {past.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  marginBottom: "10px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Past Visits
              </p>
              {Object.entries(groupByMonth(past)).map(([month, appts]) => (
                <div key={month} className="mb-5">
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-on-stone-faint)",
                      marginBottom: "8px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {month}
                  </p>
                  <div className="space-y-2">
                    {appts.map((appt) => {
                      const badge = getStatusBadge(appt.status);
                      const beforeUrl = appt.completion_photos?.before_photo_url;
                      const afterUrl = appt.completion_photos?.after_photo_url;
                      const hasPhotos = beforeUrl || afterUrl;
                      return (
                        <Card key={appt.id}>
                          <CardContent style={{ padding: "14px 16px" }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "var(--text-on-stone)",
                                    fontFamily: "'DM Sans', sans-serif",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {appt.service_name}
                                </p>
                                <p
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text-muted)",
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  {new Date(appt.start_at).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                  {" \u00B7 "}
                                  {appt.duration_mins} min
                                </p>
                              </div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "3px 10px",
                                  borderRadius: "20px",
                                  color: badge.color,
                                  background: badge.bg,
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                {badge.label}
                              </span>
                            </div>
                            {hasPhotos && (
                              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                {beforeUrl && (
                                  <div style={{ flex: 1 }}>
                                    <p style={{
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      color: "var(--text-muted)",
                                      marginBottom: "3px",
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}>Before</p>
                                    <img
                                      src={beforeUrl}
                                      alt="Before"
                                      style={{
                                        width: "100%",
                                        aspectRatio: "4/3",
                                        objectFit: "cover",
                                        borderRadius: "6px",
                                      }}
                                    />
                                  </div>
                                )}
                                {afterUrl && (
                                  <div style={{ flex: 1 }}>
                                    <p style={{
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      color: "var(--text-muted)",
                                      marginBottom: "3px",
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}>After</p>
                                    <img
                                      src={afterUrl}
                                      alt="After"
                                      style={{
                                        width: "100%",
                                        aspectRatio: "4/3",
                                        objectFit: "cover",
                                        borderRadius: "6px",
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
