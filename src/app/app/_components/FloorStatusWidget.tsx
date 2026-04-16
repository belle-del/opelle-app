"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceSession, ServiceSessionStatus, ServiceTask, ServiceTaskType, ServiceTaskPriority } from "@/lib/types";

// ── Status Colors ─────────────────────────────────────────────────────
const STATUS_COLORS: Record<ServiceSessionStatus, { bg: string; border: string; text: string; label: string }> = {
  checked_in: { bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.25)", text: "#6B7280", label: "Checked In" },
  consultation: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "#3B82F6", label: "Consultation" },
  in_progress: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#10B981", label: "In Progress" },
  processing: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#F59E0B", label: "Processing" },
  needs_help: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#EF4444", label: "Needs Help" },
  finishing: { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", text: "#8B5CF6", label: "Finishing" },
  complete: { bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)", text: "#059669", label: "Complete" },
};

const TASK_TYPE_LABELS: Record<ServiceTaskType, string> = {
  mix_color: "Mix Color",
  check_processing: "Check Processing",
  get_supplies: "Get Supplies",
  rinse: "Rinse",
  blowdry: "Blow Dry",
  restock: "Restock",
  shampoo: "Shampoo",
  prep_station: "Prep Station",
  custom: "Custom",
};

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
}

interface FloorStatusWidgetProps {
  clients: Client[];
}

export function FloorStatusWidget({ clients }: FloorStatusWidgetProps) {
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [myTasks, setMyTasks] = useState<ServiceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const getClientName = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return "Unknown";
    return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
  };

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, tasksRes] = await Promise.all([
        fetch("/api/floor/sessions"),
        fetch("/api/service-tasks/mine"),
      ]);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setMyTasks(data.tasks || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/service-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (res.ok) {
        setMyTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch {}
  };

  const helpSessions = sessions.filter(s => s.status === "needs_help");
  const activeSessions = sessions.filter(s => s.status !== "needs_help");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid var(--stone-mid)",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "14px", color: "var(--text-on-stone)", fontWeight: 600 }}>
          Floor Status
        </p>
        <span style={{
          padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 600,
          background: "var(--stone-mid)", color: "var(--text-on-stone-faint)",
        }}>
          {sessions.length} active
        </span>
        {helpSessions.length > 0 && (
          <span style={{
            padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700,
            background: "rgba(239,68,68,0.12)", color: "#EF4444",
            animation: "pulse 2s ease-in-out infinite",
          }}>
            {helpSessions.length} need help
          </span>
        )}
        <button
          onClick={() => setShowAssignModal(true)}
          style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: "4px",
            fontSize: "9px", fontWeight: 600, background: "var(--garnet)",
            color: "white", border: "none", cursor: "pointer",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}
        >
          + Task
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: "48px", borderRadius: "6px", background: "var(--stone-mid)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : (
          <>
            {/* Help Alerts */}
            {helpSessions.map(session => (
              <StationCard
                key={session.id}
                session={session}
                clientName={getClientName(session.clientId)}
                isHelp
              />
            ))}

            {/* Active Stations */}
            {activeSessions.length === 0 && helpSessions.length === 0 && (
              <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "16px" }}>
                No active service sessions
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
              {activeSessions.map(session => (
                <StationCard
                  key={session.id}
                  session={session}
                  clientName={getClientName(session.clientId)}
                />
              ))}
            </div>

            {/* My Tasks */}
            {myTasks.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <p style={{
                  fontSize: "8px", fontWeight: 700, color: "var(--text-on-stone-faint)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px",
                }}>
                  My Tasks ({myTasks.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {myTasks.map(task => (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "6px 8px", borderRadius: "4px",
                      background: task.priority === "urgent" ? "rgba(239,68,68,0.06)" : "var(--stone-light)",
                      border: `1px solid ${task.priority === "urgent" ? "rgba(239,68,68,0.2)" : "var(--stone-mid)"}`,
                    }}>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, color: task.priority === "urgent" ? "#EF4444" : "var(--text-on-stone)",
                        textTransform: "uppercase",
                      }}>
                        {TASK_TYPE_LABELS[task.taskType]}
                      </span>
                      {task.description && (
                        <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.description}
                        </span>
                      )}
                      {task.priority === "urgent" && (
                        <span style={{ padding: "1px 6px", borderRadius: "100px", fontSize: "7px", fontWeight: 700, background: "#EF4444", color: "white" }}>
                          URGENT
                        </span>
                      )}
                      <button
                        onClick={() => completeTask(task.id)}
                        style={{
                          padding: "2px 8px", borderRadius: "3px", fontSize: "8px", fontWeight: 700,
                          background: "var(--status-confirmed)", color: "white",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && (
        <AssignTaskModal
          onClose={() => setShowAssignModal(false)}
          sessions={sessions}
          onCreated={() => {
            setShowAssignModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ── Station Card ─────────────────────────────────────────────────────

function StationCard({ session, clientName, isHelp }: {
  session: ServiceSession;
  clientName: string;
  isHelp?: boolean;
}) {
  const cfg = STATUS_COLORS[session.status];
  const elapsed = session.checkedInAt
    ? Math.floor((Date.now() - new Date(session.checkedInAt).getTime()) / 60000)
    : 0;

  return (
    <div style={{
      padding: "8px 10px", borderRadius: "6px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      marginBottom: isHelp ? "8px" : 0,
      animation: isHelp ? "pulse 2s ease-in-out infinite" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.text, flexShrink: 0 }} />
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-on-stone)" }}>
          {clientName}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: "9px", fontWeight: 600, color: cfg.text,
          textTransform: "uppercase",
        }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
          {session.serviceName}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-on-stone-ghost)", fontVariantNumeric: "tabular-nums" }}>
          {elapsed}m
        </span>
      </div>
      {isHelp && session.helpRequestNote && (
        <p style={{ fontSize: "10px", color: "#EF4444", fontWeight: 500, marginTop: "4px" }}>
          {session.helpRequestNote}
        </p>
      )}
    </div>
  );
}

// ── Assign Task Modal ────────────────────────────────────────────────

function AssignTaskModal({ onClose, sessions, onCreated }: {
  onClose: () => void;
  sessions: ServiceSession[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    assignedTo: "",
    taskType: "custom" as ServiceTaskType,
    description: "",
    dueInMinutes: 15,
    priority: "normal" as ServiceTaskPriority,
    sessionId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Fetch workspace members for assignment
    fetch("/api/team")
      .then(r => r.ok ? r.json() : { members: [] })
      .then(data => {
        const list = (data.members || []).map((m: Record<string, string>) => ({
          id: m.user_id || m.id,
          name: m.display_name || m.name || m.email || "Team Member",
        }));
        setMembers(list);
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.assignedTo || !form.taskType) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/service-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: form.assignedTo,
          taskType: form.taskType,
          description: form.description || undefined,
          dueInMinutes: form.dueInMinutes,
          priority: form.priority,
          sessionId: form.sessionId || undefined,
        }),
      });
      if (res.ok) onCreated();
    } catch {}
    setSubmitting(false);
  };

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "8px", zIndex: 50,
    }}>
      <div style={{
        background: "var(--stone-card)", borderRadius: "8px", padding: "16px",
        width: "280px", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "14px", fontWeight: 600, color: "var(--text-on-stone)" }}>
            Assign Task
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--text-on-stone-faint)" }}>
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ModalSelect label="Assign To" value={form.assignedTo}
            onChange={v => setForm({ ...form, assignedTo: v })}
            options={members.map(m => ({ value: m.id, label: m.name }))} />

          <ModalSelect label="Task Type" value={form.taskType}
            onChange={v => setForm({ ...form, taskType: v as ServiceTaskType })}
            options={Object.entries(TASK_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />

          <ModalSelect label="Link to Service" value={form.sessionId}
            onChange={v => setForm({ ...form, sessionId: v })}
            options={sessions.map(s => ({ value: s.id, label: `${s.serviceName}` }))} />

          <ModalSelect label="Priority" value={form.priority}
            onChange={v => setForm({ ...form, priority: v as ServiceTaskPriority })}
            options={[
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]} />

          <div>
            <label style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "3px" }}>
              Notes
            </label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Task details..."
              style={{
                width: "100%", padding: "5px 8px", borderRadius: "4px",
                border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                fontSize: "11px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif",
              }} />
          </div>

          <button onClick={submit} disabled={submitting || !form.assignedTo}
            style={{
              padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
              background: "var(--garnet)", color: "white", border: "none", cursor: "pointer",
              opacity: !form.assignedTo ? 0.5 : 1, marginTop: "4px",
            }}>
            {submitting ? "Creating..." : "Assign Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "3px" }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "5px 8px", borderRadius: "4px",
          border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
          fontSize: "11px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif",
        }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
