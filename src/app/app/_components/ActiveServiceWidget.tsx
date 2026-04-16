"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceSession, ServiceSessionStatus, CheatSheet } from "@/lib/types";

// ── Status Config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ServiceSessionStatus, { label: string; color: string; bg: string; icon: string }> = {
  checked_in: { label: "Checked In", color: "#6B7280", bg: "rgba(107,114,128,0.12)", icon: "◉" },
  consultation: { label: "Consultation", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: "◎" },
  in_progress: { label: "In Progress", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: "▶" },
  processing: { label: "Processing", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "⏱" },
  needs_help: { label: "Needs Help", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: "!" },
  finishing: { label: "Finishing", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", icon: "✦" },
  complete: { label: "Complete", color: "#059669", bg: "rgba(5,150,105,0.12)", icon: "✓" },
};

const STEPS: ServiceSessionStatus[] = ["checked_in", "consultation", "in_progress", "processing", "finishing", "complete"];

type Tab = "cheatsheet" | "inspo" | "consult" | "formula" | "photos" | "complete";

interface ActiveServiceWidgetProps {
  session: ServiceSession;
  clientName: string;
}

export function ActiveServiceWidget({ session: initialSession, clientName }: ActiveServiceWidgetProps) {
  const [session, setSession] = useState(initialSession);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("cheatsheet");
  const [cheatSheet, setCheatSheet] = useState<{ cheatSheet: CheatSheet; aiSummary: string | null } | null>(null);
  const [cheatSheetLoading, setCheatSheetLoading] = useState(false);

  // Consultation form state
  const [consultForm, setConsultForm] = useState({
    currentCondition: "",
    scalpCondition: "",
    serviceRequested: "",
    specificRequests: "",
    stylistNotes: "",
    concerns: [] as string[],
    clientConfirmed: false,
  });
  const [consultSaved, setConsultSaved] = useState(false);
  const [consultSaving, setConsultSaving] = useState(false);

  // Help request
  const [helpNote, setHelpNote] = useState("");
  const [helpRequesting, setHelpRequesting] = useState(false);

  // Processing timer
  const [timerMinutes, setTimerMinutes] = useState(session.processingTimerMinutes || 0);
  const [timerElapsed, setTimerElapsed] = useState(0);

  // Feedback form
  const [feedback, setFeedback] = useState({
    formulaAchievedExpected: true,
    clientSatisfaction: 5,
    adjustmentNotes: "",
    anyReactions: false,
    reactionNotes: "",
  });

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Poll for session updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/services/active");
        if (res.ok) {
          const data = await res.json();
          const active = data.sessions?.[0];
          if (active) setSession(active);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Processing timer countdown
  useEffect(() => {
    if (session.status !== "processing" || !session.processingStartedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(session.processingStartedAt!).getTime()) / 1000);
      setTimerElapsed(elapsed);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.status, session.processingStartedAt]);

  // Load cheat sheet
  const loadCheatSheet = useCallback(async () => {
    if (cheatSheet || cheatSheetLoading) return;
    setCheatSheetLoading(true);
    try {
      const res = await fetch(`/api/services/cheat-sheet/${session.clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCheatSheet(data);
      }
    } catch {}
    setCheatSheetLoading(false);
  }, [session.clientId, cheatSheet, cheatSheetLoading]);

  useEffect(() => {
    if (activeTab === "cheatsheet") loadCheatSheet();
  }, [activeTab, loadCheatSheet]);

  // Load existing consultation
  useEffect(() => {
    if (activeTab === "consult" && session.consultationId) {
      fetch(`/api/services/${session.id}/consultation`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.consultation) {
            const c = data.consultation;
            setConsultForm({
              currentCondition: c.currentCondition || "",
              scalpCondition: c.scalpCondition || "",
              serviceRequested: c.serviceRequested || "",
              specificRequests: c.specificRequests || "",
              stylistNotes: c.stylistNotes || "",
              concerns: c.concerns || [],
              clientConfirmed: c.clientConfirmed || false,
            });
            setConsultSaved(true);
          }
        })
        .catch(() => {});
    }
  }, [activeTab, session.id, session.consultationId]);

  const updateStatus = async (newStatus: ServiceSessionStatus, extras?: Record<string, unknown>) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/services/${session.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extras }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch {}
    setStatusUpdating(false);
  };

  const saveConsultation = async () => {
    setConsultSaving(true);
    try {
      const res = await fetch(`/api/services/${session.id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consultForm),
      });
      if (res.ok) {
        setConsultSaved(true);
        // Auto-advance to consultation status if checked_in
        if (session.status === "checked_in") {
          const activeRes = await fetch("/api/services/active");
          if (activeRes.ok) {
            const data = await activeRes.json();
            if (data.sessions?.[0]) setSession(data.sessions[0]);
          }
        }
      }
    } catch {}
    setConsultSaving(false);
  };

  const requestHelp = async () => {
    setHelpRequesting(true);
    try {
      await fetch(`/api/services/${session.id}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: helpNote || "Help needed" }),
      });
      const res = await fetch("/api/services/active");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions?.[0]) setSession(data.sessions[0]);
      }
    } catch {}
    setHelpRequesting(false);
    setHelpNote("");
  };

  const submitFeedback = async () => {
    try {
      await fetch(`/api/services/${session.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedback),
      });
    } catch {}
  };

  const completeService = async () => {
    setStatusUpdating(true);
    try {
      // Submit feedback first
      await submitFeedback();
      // Then complete
      const res = await fetch(`/api/services/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch {}
    setStatusUpdating(false);
  };

  const statusCfg = STATUS_CONFIG[session.status];
  const currentStepIdx = STEPS.indexOf(session.status === "needs_help" ? "in_progress" : session.status);

  const elapsedStr = session.checkedInAt
    ? formatElapsed(Date.now() - new Date(session.checkedInAt).getTime())
    : "";

  const processingTotalSec = (session.processingTimerMinutes || timerMinutes) * 60;
  const processingRemaining = Math.max(0, processingTotalSec - timerElapsed);
  const processingOvertime = timerElapsed > processingTotalSec && processingTotalSec > 0;

  if (session.status === "complete") return null;

  // ── Collapsed ──────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: "100%", padding: "12px 16px", background: statusCfg.bg,
          border: `1px solid ${statusCfg.color}33`, borderRadius: "8px",
          display: "flex", alignItems: "center", gap: "10px",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: statusCfg.color, lineHeight: 1 }}>
          {statusCfg.icon}
        </span>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: "13px", fontWeight: 600, color: "var(--text-on-stone)" }}>
          ACTIVE SERVICE
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 500 }}>
          {clientName}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
          ({session.serviceName})
        </span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: statusCfg.color, fontWeight: 600 }}>
          {statusCfg.label}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
          {elapsedStr}
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>▼</span>
      </button>
    );
  }

  // ── Expanded ───────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 12px", borderBottom: "1px solid var(--stone-mid)",
          display: "flex", alignItems: "center", gap: "10px",
        }}
      >
        <button
          onClick={() => setExpanded(false)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "12px", color: "var(--text-on-stone-faint)" }}
        >
          ▲
        </button>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: "14px", fontWeight: 600, color: "var(--text-on-stone)" }}>
          {clientName}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
          {session.serviceName}
        </span>
        <span
          style={{
            marginLeft: "auto", padding: "2px 10px", borderRadius: "100px",
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.05em",
            color: statusCfg.color, background: statusCfg.bg,
            textTransform: "uppercase",
          }}
        >
          {statusCfg.label}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", fontVariantNumeric: "tabular-nums" }}>
          {elapsedStr}
        </span>
      </div>

      {/* Progress Steps */}
      <div style={{ padding: "8px 12px", display: "flex", gap: "2px", borderBottom: "1px solid var(--stone-mid)" }}>
        {STEPS.map((step, i) => {
          const cfg = STATUS_CONFIG[step];
          const isActive = i === currentStepIdx;
          const isDone = i < currentStepIdx;
          return (
            <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <div
                style={{
                  width: "100%", height: "3px", borderRadius: "2px",
                  background: isDone ? "var(--garnet)" : isActive ? cfg.color : "var(--stone-mid)",
                  transition: "background 0.3s ease",
                }}
              />
              <span style={{
                fontSize: "7px", fontWeight: isActive ? 700 : 500,
                color: isActive ? cfg.color : isDone ? "var(--text-on-stone)" : "var(--text-on-stone-ghost)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Help request banner */}
      {session.status === "needs_help" && (
        <div style={{
          padding: "8px 12px", background: "rgba(239,68,68,0.08)",
          borderBottom: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "14px" }}>!</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#EF4444" }}>
            Help requested: {session.helpRequestNote || "Waiting for assistance"}
          </span>
          <button
            onClick={() => updateStatus("in_progress")}
            disabled={statusUpdating}
            style={{
              marginLeft: "auto", padding: "3px 10px", borderRadius: "4px",
              fontSize: "9px", fontWeight: 600, background: "#EF4444", color: "white",
              border: "none", cursor: "pointer",
            }}
          >
            Resume
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--stone-mid)", padding: "0 8px" }}>
        {(["cheatsheet", "consult", "formula", "photos", "complete"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 10px", border: "none", cursor: "pointer",
              fontSize: "10px", fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "var(--garnet)" : "var(--text-on-stone-faint)",
              borderBottom: activeTab === tab ? "2px solid var(--garnet)" : "2px solid transparent",
              background: "transparent", textTransform: "capitalize",
              letterSpacing: "0.03em",
            }}
          >
            {tab === "cheatsheet" ? "Cheat Sheet" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {activeTab === "cheatsheet" && (
          <CheatSheetTab cheatSheet={cheatSheet} loading={cheatSheetLoading} />
        )}

        {activeTab === "consult" && (
          <ConsultTab
            form={consultForm}
            setForm={setConsultForm}
            saved={consultSaved}
            saving={consultSaving}
            onSave={saveConsultation}
          />
        )}

        {activeTab === "formula" && (
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", marginBottom: "8px" }}>
              View and edit formulas for this client in the Formula workspace.
            </p>
            <a
              href={`/app/formulas?client=${session.clientId}`}
              style={{
                display: "inline-block", padding: "6px 14px", borderRadius: "6px",
                fontSize: "11px", fontWeight: 600, background: "var(--garnet)",
                color: "white", textDecoration: "none",
              }}
            >
              Open Formula Editor
            </a>
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", marginBottom: "8px" }}>
              Before/after photos are captured through the service completion flow.
            </p>
            {session.beforePhotoUrl && (
              <div style={{ marginBottom: "8px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Before</p>
                <img src={session.beforePhotoUrl} alt="Before" style={{ width: "120px", borderRadius: "6px", border: "1px solid var(--stone-mid)" }} />
              </div>
            )}
            {session.afterPhotoUrl && (
              <div>
                <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>After</p>
                <img src={session.afterPhotoUrl} alt="After" style={{ width: "120px", borderRadius: "6px", border: "1px solid var(--stone-mid)" }} />
              </div>
            )}
          </div>
        )}

        {activeTab === "complete" && (
          <CompleteTab
            session={session}
            feedback={feedback}
            setFeedback={setFeedback}
            onComplete={completeService}
            updating={statusUpdating}
          />
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        padding: "8px 12px", borderTop: "1px solid var(--stone-mid)",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {/* Status actions based on current state */}
        {session.status === "checked_in" && (
          <button onClick={() => updateStatus("in_progress")} disabled={statusUpdating}
            style={actionBtnStyle("var(--garnet)")}>
            Start Service
          </button>
        )}
        {session.status === "consultation" && (
          <button onClick={() => updateStatus("in_progress")} disabled={statusUpdating}
            style={actionBtnStyle("var(--garnet)")}>
            Begin Service
          </button>
        )}
        {session.status === "in_progress" && (
          <>
            <button onClick={() => {
              updateStatus("processing", { processingTimerMinutes: timerMinutes || 30 });
            }} disabled={statusUpdating} style={actionBtnStyle("#F59E0B")}>
              Start Processing
            </button>
            <input
              type="number" min={1} max={120} value={timerMinutes || 30}
              onChange={e => setTimerMinutes(parseInt(e.target.value) || 30)}
              style={{
                width: "48px", padding: "4px 6px", borderRadius: "4px",
                border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                fontSize: "11px", textAlign: "center", color: "var(--text-on-stone)",
              }}
            />
            <span style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>min</span>
          </>
        )}
        {session.status === "processing" && (
          <>
            <div style={{
              padding: "4px 10px", borderRadius: "4px",
              background: processingOvertime ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
              fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: processingOvertime ? "#EF4444" : "#F59E0B",
            }}>
              {processingOvertime ? "+" : ""}{formatTimer(processingOvertime ? timerElapsed - processingTotalSec : processingRemaining)}
            </div>
            <button onClick={() => updateStatus("finishing")} disabled={statusUpdating}
              style={actionBtnStyle("var(--garnet)")}>
              Done Processing
            </button>
          </>
        )}
        {session.status === "finishing" && (
          <button onClick={() => { setActiveTab("complete"); }} style={actionBtnStyle("var(--garnet)")}>
            Go to Checkout
          </button>
        )}

        {/* Help button — always visible during active service */}
        {!["checked_in", "complete", "needs_help"].includes(session.status) && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              value={helpNote}
              onChange={e => setHelpNote(e.target.value)}
              placeholder="Note..."
              style={{
                width: "100px", padding: "4px 8px", borderRadius: "4px",
                border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                fontSize: "10px", color: "var(--text-on-stone)",
              }}
            />
            <button onClick={requestHelp} disabled={helpRequesting}
              style={{
                padding: "4px 10px", borderRadius: "4px", fontSize: "9px",
                fontWeight: 700, background: "#EF4444", color: "white",
                border: "none", cursor: "pointer", textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
              Help
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function CheatSheetTab({ cheatSheet, loading }: {
  cheatSheet: { cheatSheet: CheatSheet; aiSummary: string | null } | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: "16px", borderRadius: "4px", background: "var(--stone-mid)",
            animation: "pulse 1.5s ease-in-out infinite",
            width: `${70 + i * 10}%`,
          }} />
        ))}
      </div>
    );
  }

  if (!cheatSheet) {
    return <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No data available yet.</p>;
  }

  const cs = cheatSheet.cheatSheet;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* AI Summary */}
      {cheatSheet.aiSummary && (
        <div style={{
          padding: "10px", borderRadius: "6px", background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.15)",
        }}>
          <p style={{ fontSize: "8px", fontWeight: 700, color: "#8B5CF6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
            Metis Briefing
          </p>
          <p style={{ fontSize: "11px", lineHeight: "1.5", color: "var(--text-on-stone)" }}>
            {cheatSheet.aiSummary}
          </p>
        </div>
      )}

      {/* Last Visit */}
      {cs.lastVisit && (
        <InfoBlock label="Last Visit">
          <p style={{ fontSize: "11px", color: "var(--text-on-stone)" }}>
            {cs.lastVisit.service} — {new Date(cs.lastVisit.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </InfoBlock>
      )}

      {/* Service Snapshot */}
      {cs.serviceSnapshot && (
        <InfoBlock label="Service Profile">
          {cs.serviceSnapshot.pattern && <DetailRow label="Pattern" value={cs.serviceSnapshot.pattern} />}
          {cs.serviceSnapshot.preferences && <DetailRow label="Preferences" value={cs.serviceSnapshot.preferences} />}
          {cs.serviceSnapshot.treatments && <DetailRow label="Maintenance" value={cs.serviceSnapshot.treatments} />}
          {cs.serviceSnapshot.goals && <DetailRow label="Goals" value={cs.serviceSnapshot.goals} />}
        </InfoBlock>
      )}

      {/* Personalization Cues */}
      {cs.personalizationCues.length > 0 && (
        <InfoBlock label="Quick Notes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {cs.personalizationCues.map((cue, i) => (
              <span key={i} style={{
                padding: "2px 8px", borderRadius: "100px", fontSize: "9px",
                background: "var(--stone-mid)", color: "var(--text-on-stone)",
                fontWeight: 500,
              }}>
                {cue}
              </span>
            ))}
          </div>
        </InfoBlock>
      )}
    </div>
  );
}

function ConsultTab({ form, setForm, saved, saving, onSave }: {
  form: {
    currentCondition: string;
    scalpCondition: string;
    serviceRequested: string;
    specificRequests: string;
    stylistNotes: string;
    concerns: string[];
    clientConfirmed: boolean;
  };
  setForm: (f: typeof form) => void;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <FormSelect
          label="Hair Condition"
          value={form.currentCondition}
          onChange={v => setForm({ ...form, currentCondition: v })}
          options={[
            { value: "excellent", label: "Excellent" },
            { value: "good", label: "Good" },
            { value: "fair", label: "Fair" },
            { value: "damaged", label: "Damaged" },
            { value: "severely_damaged", label: "Severely Damaged" },
          ]}
        />
        <FormSelect
          label="Scalp Condition"
          value={form.scalpCondition}
          onChange={v => setForm({ ...form, scalpCondition: v })}
          options={[
            { value: "healthy", label: "Healthy" },
            { value: "dry", label: "Dry" },
            { value: "oily", label: "Oily" },
            { value: "sensitive", label: "Sensitive" },
            { value: "issues", label: "Issues" },
          ]}
        />
      </div>

      <FormTextarea
        label="Service Requested"
        value={form.serviceRequested}
        onChange={v => setForm({ ...form, serviceRequested: v })}
        placeholder="What does the client want today?"
      />

      <FormTextarea
        label="Specific Requests"
        value={form.specificRequests}
        onChange={v => setForm({ ...form, specificRequests: v })}
        placeholder="Any specific preferences or instructions..."
      />

      <FormTextarea
        label="Stylist Notes"
        value={form.stylistNotes}
        onChange={v => setForm({ ...form, stylistNotes: v })}
        placeholder="Your observations and recommendations..."
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={form.clientConfirmed}
          onChange={e => setForm({ ...form, clientConfirmed: e.target.checked })}
          style={{ accentColor: "var(--garnet)" }}
        />
        <span style={{ fontSize: "11px", color: "var(--text-on-stone)" }}>Client confirmed plan</span>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
          background: saved ? "var(--status-confirmed)" : "var(--garnet)",
          color: "white", border: "none", cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Consultation"}
      </button>
    </div>
  );
}

function CompleteTab({ session, feedback, setFeedback, onComplete, updating }: {
  session: ServiceSession;
  feedback: {
    formulaAchievedExpected: boolean;
    clientSatisfaction: number;
    adjustmentNotes: string;
    anyReactions: boolean;
    reactionNotes: string;
  };
  setFeedback: (f: typeof feedback) => void;
  onComplete: () => void;
  updating: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <InfoBlock label="Post-Service Feedback">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-on-stone)", minWidth: "100px" }}>Formula accurate?</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setFeedback({ ...feedback, formulaAchievedExpected: v })}
                  style={{
                    padding: "3px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                    background: feedback.formulaAchievedExpected === v ? "var(--garnet)" : "var(--stone-mid)",
                    color: feedback.formulaAchievedExpected === v ? "white" : "var(--text-on-stone)",
                    border: "none", cursor: "pointer",
                  }}>
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-on-stone)", minWidth: "100px" }}>Satisfaction</span>
            <div style={{ display: "flex", gap: "3px" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setFeedback({ ...feedback, clientSatisfaction: n })}
                  style={{
                    width: "24px", height: "24px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                    background: n <= feedback.clientSatisfaction ? "var(--garnet)" : "var(--stone-mid)",
                    color: n <= feedback.clientSatisfaction ? "white" : "var(--text-on-stone)",
                    border: "none", cursor: "pointer",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-on-stone)", minWidth: "100px" }}>Any reactions?</span>
            <input type="checkbox" checked={feedback.anyReactions}
              onChange={e => setFeedback({ ...feedback, anyReactions: e.target.checked })}
              style={{ accentColor: "var(--garnet)" }} />
          </div>

          {feedback.anyReactions && (
            <FormTextarea label="Reaction Details" value={feedback.reactionNotes}
              onChange={v => setFeedback({ ...feedback, reactionNotes: v })}
              placeholder="Describe the reaction..." />
          )}

          <FormTextarea label="Adjustment Notes" value={feedback.adjustmentNotes}
            onChange={v => setFeedback({ ...feedback, adjustmentNotes: v })}
            placeholder="What would you change next time?" />
        </div>
      </InfoBlock>

      {session.status === "finishing" && (
        <button onClick={onComplete} disabled={updating}
          style={{
            padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 700,
            background: "var(--garnet)", color: "white", border: "none", cursor: "pointer",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
          {updating ? "Completing..." : "Complete Service"}
        </button>
      )}
    </div>
  );
}

// ── Shared UI atoms ──────────────────────────────────────────────────

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-on-stone-faint)", minWidth: "70px" }}>{label}</span>
      <span style={{ fontSize: "10px", color: "var(--text-on-stone)" }}>{value}</span>
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
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
          fontSize: "11px", color: "var(--text-on-stone)",
          fontFamily: "'DM Sans', sans-serif",
        }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "3px" }}>
        {label}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={2}
        style={{
          width: "100%", padding: "6px 8px", borderRadius: "4px",
          border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
          fontSize: "11px", color: "var(--text-on-stone)",
          fontFamily: "'DM Sans', sans-serif", resize: "vertical",
        }}
      />
    </div>
  );
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: "5px 14px", borderRadius: "5px", fontSize: "10px", fontWeight: 700,
    background: bg, color: "white", border: "none", cursor: "pointer",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
}

// ── Utility ──────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
