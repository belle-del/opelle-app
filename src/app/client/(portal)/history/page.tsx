"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

type AppointmentRow = {
  id: string;
  service_name: string;
  start_at: string;
  end_at: string | null;
  duration_mins: number;
  status: string;
  notes: string | null;
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
      return { label: "Completed", color: "#4A7C59", bg: "rgba(74, 124, 89, 0.1)" };
    case "scheduled":
      return { label: "Upcoming", color: "#C4AB70", bg: "rgba(196, 171, 112, 0.1)" };
    case "pending_confirmation":
      return { label: "Pending", color: "#9E5A5A", bg: "rgba(158, 90, 90, 0.1)" };
    case "cancelled":
      return { label: "Cancelled", color: "#7A7A72", bg: "rgba(122, 122, 114, 0.1)" };
    default:
      return { label: status, color: "#7A7A72", bg: "rgba(122, 122, 114, 0.1)" };
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
    fetch("/api/client/appointments")
      .then((res) => res.json())
      .then((data) => {
        setAppointments(data.appointments || []);
      })
      .catch(() => {})
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
          color: "#2C2C24",
        }}
      >
        History
      </h1>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p style={{ fontSize: "13px", color: "#7A7A72" }}>Loading your appointments...</p>
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
              stroke="#C4AB70"
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
                color: "#2C2C24",
                marginBottom: "4px",
              }}
            >
              No appointments yet
            </p>
            <p style={{ fontSize: "12px", color: "#7A7A72" }}>
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
                  color: "#C4AB70",
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
                                color: "#2C2C24",
                                marginBottom: "4px",
                              }}
                            >
                              {appt.service_name}
                            </p>
                            <p
                              style={{
                                fontSize: "13px",
                                color: "#5C5A4F",
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {formatDate(appt.start_at)}
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#8A8778",
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
                  color: "#8A8778",
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
                      color: "#5C5A4F",
                      marginBottom: "8px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {month}
                  </p>
                  <div className="space-y-2">
                    {appts.map((appt) => {
                      const badge = getStatusBadge(appt.status);
                      return (
                        <Card key={appt.id}>
                          <CardContent style={{ padding: "14px 16px" }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "#2C2C24",
                                    fontFamily: "'DM Sans', sans-serif",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {appt.service_name}
                                </p>
                                <p
                                  style={{
                                    fontSize: "12px",
                                    color: "#8A8778",
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
