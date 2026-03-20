"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Appointment = {
  id: string;
  serviceName: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  status: string;
  notes?: string;
};

type Props = {
  clientName: string;
  appointments: Appointment[];
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByMonth(appts: Appointment[]): Record<string, Appointment[]> {
  const groups: Record<string, Appointment[]> = {};
  for (const a of appts) {
    const d = new Date(a.startAt);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}

export function HistoryTab({ clientName, appointments }: Props) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto mb-2"
          style={{ color: "var(--text-on-stone-ghost)" }}
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
        <p className="text-sm text-muted-foreground">
          No appointments for {clientName} yet
        </p>
      </div>
    );
  }

  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "pending_confirmation"
  );
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  // Summary stats
  const totalCompleted = completed.length;
  const totalHours = Math.round(
    completed.reduce((sum, a) => sum + a.durationMins, 0) / 60
  );
  const lastVisit = completed.length > 0 ? completed[0] : null;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-lg p-3 text-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-2xl font-semibold" style={{ color: "var(--brass, #D4B76A)" }}>
            {totalCompleted}
          </p>
          <p className="text-xs text-muted-foreground">Visits</p>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-2xl font-semibold" style={{ color: "var(--brass, #D4B76A)" }}>
            {totalHours}
          </p>
          <p className="text-xs text-muted-foreground">Hours</p>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--brass, #D4B76A)" }}>
            {lastVisit
              ? new Date(lastVisit.startAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Last Visit</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">
            Upcoming ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.map((appt) => (
              <Link
                key={appt.id}
                href={`/app/appointments/${appt.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{appt.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(appt.startAt)} at {formatTime(appt.startAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appt.status === "pending_confirmation" ? "warning" : "outline"
                    }
                  >
                    {appt.status === "pending_confirmation" ? "Pending" : "Scheduled"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed — grouped by month */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">
            Completed ({completed.length})
          </p>
          {Object.entries(groupByMonth(completed)).map(([month, appts]) => (
            <div key={month} className="mb-4">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                {month}
              </p>
              <div className="space-y-1.5">
                {appts.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/app/appointments/${appt.id}`}
                    className="block rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{appt.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(appt.startAt)} &middot; {appt.durationMins} min
                        </p>
                      </div>
                      <Badge variant="success">Completed</Badge>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        {appt.notes}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">
            Cancelled ({cancelled.length})
          </p>
          <div className="space-y-1.5">
            {cancelled.map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{appt.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(appt.startAt)}
                    </p>
                  </div>
                  <Badge variant="danger">Cancelled</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
