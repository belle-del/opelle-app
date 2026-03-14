"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type ClientInfo = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type Props = {
  requests: RebookRequest[];
  clients: ClientInfo[];
};

function getClientName(clients: ClientInfo[], clientId: string): string {
  const client = clients.find(c => c.id === clientId);
  if (!client) return "Unknown";
  return client.lastName ? `${client.firstName} ${client.lastName}` : client.firstName || "Unknown";
}

function parseNotes(notesStr: string | null): { preferredTime?: string; timeframe?: string; clientNotes?: string } {
  if (!notesStr) return {};
  try {
    return JSON.parse(notesStr);
  } catch {
    return { clientNotes: notesStr };
  }
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const statusConfig: Record<string, { variant: "default" | "success" | "warning" | "danger"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  confirmed: { variant: "success", label: "Confirmed" },
  declined: { variant: "danger", label: "Declined" },
  acknowledged: { variant: "default", label: "Acknowledged" },
};

export function RebookRequestsList({ requests, clients }: Props) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--stone-mid)" }}>
        <p style={{ color: "var(--text-on-stone-faint)", fontSize: "13px" }}>
          No booking requests yet
        </p>
        <p style={{ color: "var(--text-on-stone-ghost)", fontSize: "11px", marginTop: "4px" }}>
          Client requests will appear here when they submit booking preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const clientName = getClientName(clients, req.client_id);
        const notes = parseNotes(req.notes);
        const status = statusConfig[req.status] || statusConfig.pending;

        return (
          <Card key={req.id}>
            <CardContent className="py-3.5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p style={{ fontSize: "14px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                    {clientName}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
                    {req.service_type || "Service not specified"}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {/* Preferences */}
              <div className="space-y-1 mb-3">
                {req.preferred_dates.length > 0 && (
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                    <span style={{ fontWeight: 500 }}>Days:</span>{" "}
                    {req.preferred_dates.map(d => d.charAt(0).toUpperCase() + d.slice(0, 3)).join(", ")}
                  </p>
                )}
                {notes.preferredTime && (
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                    <span style={{ fontWeight: 500 }}>Time:</span>{" "}
                    <span style={{ textTransform: "capitalize" }}>{notes.preferredTime}</span>
                  </p>
                )}
                {notes.timeframe && (
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                    <span style={{ fontWeight: 500 }}>Timeframe:</span>{" "}
                    {notes.timeframe === "2_weeks" ? "Within 2 weeks" : notes.timeframe === "1_month" ? "Within a month" : "Flexible"}
                  </p>
                )}
                {notes.clientNotes && (
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", fontStyle: "italic" }}>
                    &ldquo;{notes.clientNotes}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span style={{ fontSize: "10px", color: "var(--text-on-stone-ghost)" }}>
                  {formatRelativeDate(req.created_at)}
                </span>

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Link href={`/app/appointments/new?clientId=${req.client_id}&service=${encodeURIComponent(req.service_type || "")}`}>
                      <Button size="sm">Book Them</Button>
                    </Link>
                    <Button size="sm" variant="ghost">
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
