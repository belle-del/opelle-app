"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FlaskConical, Users, Package, Calendar, CheckSquare, History, Loader2, Sparkles
} from "lucide-react";

type ActivityLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
};

const ENTITY_FILTERS = [
  { label: "All", value: "" },
  { label: "Formulas", value: "formula" },
  { label: "Clients", value: "client" },
  { label: "Products", value: "product" },
  { label: "Appointments", value: "appointment" },
  { label: "Tasks", value: "task" },
  { label: "Mentis", value: "mentis" },
];

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  formula: <FlaskConical style={{ width: "14px", height: "14px" }} />,
  client: <Users style={{ width: "14px", height: "14px" }} />,
  product: <Package style={{ width: "14px", height: "14px" }} />,
  appointment: <Calendar style={{ width: "14px", height: "14px" }} />,
  task: <CheckSquare style={{ width: "14px", height: "14px" }} />,
  mentis: <Sparkles style={{ width: "14px", height: "14px" }} />,
};

const ACTION_LABELS: Record<string, string> = {
  "formula.created": "Formula logged",
  "client.created": "Client added",
  "client.updated": "Client updated",
  "client.deleted": "Client deleted",
  "product.created": "Product added",
  "product.updated": "Product updated",
  "product.deleted": "Product deleted",
  "appointment.created": "Appointment created",
  "appointment.updated": "Appointment updated",
  "appointment.deleted": "Appointment deleted",
  "task.created": "Task created",
  "task.updated": "Task updated",
  "task.deleted": "Task deleted",
  "mentis.chat": "Mentis conversation",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?entityType=${filter}` : "";
    fetch(`/api/activity-log${params}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--text-on-bark)", fontWeight: 300 }}>
          History
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-on-bark-faint)", marginTop: "4px" }}>
          Every action taken in your workspace.
        </p>
      </header>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: "5px 14px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 500,
              border: "1px solid",
              borderColor: filter === f.value ? "var(--brass-warm)" : "var(--brass-line)",
              background: filter === f.value ? "rgba(196,171,112,0.12)" : "transparent",
              color: filter === f.value ? "var(--brass-warm)" : "var(--text-on-bark-faint)",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2 style={{ width: "24px", height: "24px", color: "var(--text-on-bark-ghost)" }} className="animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "48px", textAlign: "center" }}>
            <History style={{ width: "32px", height: "32px", margin: "0 auto 12px", color: "var(--text-on-bark-ghost)" }} />
            <p style={{ fontSize: "14px", color: "var(--text-on-bark-faint)" }}>
              {filter
                ? `No ${filter} activity yet`
                : "No activity yet — actions will appear here as you use the app."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                  background: "rgba(196,171,112,0.1)", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--brass-warm)",
                }}>
                  {ENTITY_ICONS[entry.entityType] ?? <History style={{ width: "14px", height: "14px" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--text-on-stone)", fontWeight: 500, margin: 0 }}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  {entry.entityLabel && (
                    <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px", marginBottom: 0 }}>
                      {entry.entityLabel}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", flexShrink: 0 }}>
                  {relativeTime(entry.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
