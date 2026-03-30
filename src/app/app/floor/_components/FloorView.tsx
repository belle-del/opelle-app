"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, LogIn, LogOut, UserCheck, Users, RefreshCw } from "lucide-react";
import { StudentProfilePanel } from "./StudentProfilePanel";

/* ─── Design tokens ───────────────────────────────────────── */
const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";

/* ─── Types ───────────────────────────────────────────────── */
type FloorStatus = "clocked_out" | "available" | "with_client" | "on_break";

interface Student {
  id: string;
  studentId: string;
  studentName: string;
  status: FloorStatus;
  currentClient: { id: string; name: string } | null;
  currentService: string | null;
  statusChangedAt: string;
  clockedInAt: string | null;
  waitingMinutes: number | null;
}

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<FloorStatus, { label: string; variant: "default" | "success" | "warning" | "danger"; icon: typeof Clock }> = {
  clocked_out: { label: "CLOCKED OUT", variant: "default", icon: LogOut },
  available: { label: "AVAILABLE", variant: "success", icon: UserCheck },
  with_client: { label: "WITH CLIENT", variant: "warning", icon: Users },
  on_break: { label: "ON BREAK", variant: "danger", icon: Coffee },
};

type FilterTab = "all" | FloorStatus;

/* ─── Component ───────────────────────────────────────────── */
export function FloorView({ initialStudents, clients }: { initialStudents: Student[]; clients: ClientOption[] }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [assigningStudent, setAssigningStudent] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Refresh data from server
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/floor");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch {
      // silent fail
    }
  }, []);

  // Supabase realtime subscription
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const client = createClient(supabaseUrl, supabaseKey);
    const channel = client
      .channel("floor_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "floor_status" },
        () => {
          // Refresh full list on any change
          refresh();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [refresh]);

  // Also poll every 15s as fallback
  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function clockIn(studentId: string) {
    setLoading((p) => ({ ...p, [studentId]: true }));
    try {
      await fetch("/api/floor/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      await refresh();
    } finally {
      setLoading((p) => ({ ...p, [studentId]: false }));
    }
  }

  async function clockOut(studentId: string) {
    setLoading((p) => ({ ...p, [studentId]: true }));
    try {
      await fetch("/api/floor/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      await refresh();
    } finally {
      setLoading((p) => ({ ...p, [studentId]: false }));
    }
  }

  async function updateStatus(studentId: string, status: FloorStatus, clientId?: string, service?: string) {
    setLoading((p) => ({ ...p, [studentId]: true }));
    try {
      await fetch("/api/floor/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status, clientId, service }),
      });
      await refresh();
    } finally {
      setLoading((p) => ({ ...p, [studentId]: false }));
      setAssigningStudent(null);
    }
  }

  const filtered = filter === "all" ? students : students.filter((s) => s.status === filter);

  const counts: Record<string, number> = {
    all: students.length,
    available: students.filter((s) => s.status === "available").length,
    with_client: students.filter((s) => s.status === "with_client").length,
    on_break: students.filter((s) => s.status === "on_break").length,
    clocked_out: students.filter((s) => s.status === "clocked_out").length,
  };

  const onFloor = students.filter((s) => s.status !== "clocked_out").length;

  return (
    <div>
      {/* Student profile slide-out */}
      {selectedStudentId && (
        <StudentProfilePanel
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
            Clinic Floor
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_FAINT, margin: "4px 0 0" }}>
            {onFloor} student{onFloor !== 1 ? "s" : ""} on floor
          </p>
        </div>
        <button
          onClick={refresh}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${STONE_MID}`,
            background: CREAM, color: TEXT_MAIN, fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "available", "with_client", "on_break", "clocked_out"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
              background: filter === tab ? BRASS : STONE,
              color: filter === tab ? "#fff" : TEXT_MAIN,
              transition: "all 0.15s ease",
            }}
          >
            {tab === "all" ? "All" : STATUS_CONFIG[tab].label} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Student grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, color: TEXT_FAINT,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          background: CREAM, borderRadius: 12, border: `1px solid ${STONE_MID}`,
        }}>
          {students.length === 0
            ? "No students registered yet. Add students to start tracking."
            : "No students match this filter."}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((student) => {
            const config = STATUS_CONFIG[student.status];
            const Icon = config.icon;
            const isLoading = loading[student.studentId];

            return (
              <div
                key={student.id}
                style={{
                  background: CREAM,
                  border: `1px solid ${STONE_MID}`,
                  borderRadius: 12,
                  padding: 20,
                  opacity: isLoading ? 0.6 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                {/* Name + status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: GARNET, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {student.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      onClick={() => setSelectedStudentId(student.studentId)}
                      style={{
                        fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 500, color: TEXT_MAIN,
                        cursor: "pointer", textDecoration: "underline", textDecorationColor: STONE_MID,
                        textUnderlineOffset: 3,
                      }}
                    >
                      {student.studentName}
                    </span>
                  </div>
                  <Badge variant={config.variant}>
                    <Icon size={10} style={{ marginRight: 3 }} />
                    {config.label}
                  </Badge>
                </div>

                {/* Client info (if with client) */}
                {student.status === "with_client" && student.currentClient && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 8, background: STONE,
                    fontSize: 13, color: TEXT_MAIN, marginBottom: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    <strong>Client:</strong> {student.currentClient.name}
                    {student.currentService && <span style={{ color: TEXT_FAINT }}> — {student.currentService}</span>}
                  </div>
                )}

                {/* Waiting time (if available) */}
                {student.status === "available" && student.waitingMinutes != null && (
                  <div style={{
                    fontSize: 12, color: TEXT_FAINT, marginBottom: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Clock size={12} />
                    Available for {student.waitingMinutes} min
                  </div>
                )}

                {/* Assign client modal */}
                {assigningStudent === student.studentId && (
                  <div style={{
                    padding: 12, borderRadius: 8, background: STONE, marginBottom: 12,
                    border: `1px solid ${STONE_MID}`,
                  }}>
                    <p style={{ fontSize: 12, color: TEXT_FAINT, margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>
                      Select a client:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" }}>
                      {clients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => updateStatus(student.studentId, "with_client", c.id)}
                          style={{
                            padding: "6px 10px", borderRadius: 6, border: `1px solid ${STONE_MID}`,
                            background: CREAM, cursor: "pointer", textAlign: "left",
                            fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: TEXT_MAIN,
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setAssigningStudent(null)}
                      style={{
                        marginTop: 8, padding: "4px 10px", borderRadius: 6, border: "none",
                        background: "transparent", cursor: "pointer", fontSize: 12, color: TEXT_FAINT,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {student.status === "clocked_out" && (
                    <ActionButton onClick={() => clockIn(student.studentId)} disabled={isLoading}>
                      <LogIn size={12} /> Clock In
                    </ActionButton>
                  )}
                  {student.status === "available" && (
                    <>
                      <ActionButton onClick={() => setAssigningStudent(student.studentId)} disabled={isLoading}>
                        <Users size={12} /> Assign Client
                      </ActionButton>
                      <ActionButton onClick={() => updateStatus(student.studentId, "on_break")} disabled={isLoading} secondary>
                        <Coffee size={12} /> Break
                      </ActionButton>
                      <ActionButton onClick={() => clockOut(student.studentId)} disabled={isLoading} secondary>
                        <LogOut size={12} /> Clock Out
                      </ActionButton>
                    </>
                  )}
                  {student.status === "with_client" && (
                    <ActionButton onClick={() => updateStatus(student.studentId, "available")} disabled={isLoading}>
                      <UserCheck size={12} /> Mark Available
                    </ActionButton>
                  )}
                  {student.status === "on_break" && (
                    <ActionButton onClick={() => updateStatus(student.studentId, "available")} disabled={isLoading}>
                      <UserCheck size={12} /> Back on Floor
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Action Button ───────────────────────────────────────── */
function ActionButton({
  children,
  onClick,
  disabled,
  secondary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "6px 12px", borderRadius: 6,
        border: secondary ? `1px solid ${STONE_MID}` : "none",
        background: secondary ? "transparent" : GARNET,
        color: secondary ? TEXT_MAIN : "#fff",
        fontSize: 12, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
