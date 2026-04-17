"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceSession, ServiceSessionStatus, CheatSheet, ServiceProcess, ServiceTaskType } from "@/lib/types";

// ── Status Config (uses Opelle design system: garnet, brass, stone) ──
const STATUS_CONFIG: Record<ServiceSessionStatus, { label: string; color: string; bg: string; icon: string }> = {
  checked_in: { label: "Checked In", color: "var(--stone-shadow)", bg: "var(--brass-glow)", icon: "◉" },
  consultation: { label: "Consultation", color: "var(--brass)", bg: "var(--brass-glow)", icon: "◎" },
  in_progress: { label: "In Progress", color: "var(--garnet)", bg: "var(--garnet-wash)", icon: "▶" },
  processing: { label: "Processing", color: "var(--brass-warm)", bg: "var(--brass-glow)", icon: "⏱" },
  needs_help: { label: "Needs Help", color: "var(--garnet-ruby)", bg: "rgba(117,18,18,0.10)", icon: "!" },
  finishing: { label: "Finishing", color: "var(--garnet-blush)", bg: "var(--garnet-wash)", icon: "✦" },
  complete: { label: "Complete", color: "var(--status-confirmed)", bg: "rgba(143,173,200,0.10)", icon: "✓" },
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
  const [cheatSheet, setCheatSheet] = useState<{
    cheatSheet: CheatSheet;
    aiSummary: string | null;
    formulaHistory?: { date: string; notes: string; general: string | null }[];
    appointmentHistory?: { service: string; date: string; status: string; notes: string | null }[];
  } | null>(null);
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpNote, setHelpNote] = useState("");
  const [helpType, setHelpType] = useState<ServiceTaskType>("custom");
  const [helpRequesting, setHelpRequesting] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  // Process management
  const [addingProcess, setAddingProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [newProcessMinutes, setNewProcessMinutes] = useState(30);

  // Inline formula
  const [formulaText, setFormulaText] = useState("");
  const [formulaSaving, setFormulaSaving] = useState(false);
  const [formulaSaved, setFormulaSaved] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestion, setSuggestion] = useState<{ suggested_formula: string; reasoning?: string; confidence?: number; based_on?: string } | null>(null);

  // Inspo photos
  const [inspoPhotos, setInspoPhotos] = useState<{ url: string; caption?: string }[]>([]);

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

  // Load inspo photos
  useEffect(() => {
    fetch(`/api/clients/${session.clientId}/inspo-photos`)
      .then(r => r.ok ? r.json() : { photos: [] })
      .then(data => {
        const photos = (data.photos || []).map((p: { url: string; caption?: string }) => ({
          url: p.url,
          caption: p.caption,
        }));
        setInspoPhotos(photos);
      })
      .catch(() => {});
  }, [session.clientId]);

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

  // Map status → best tab to show
  const STATUS_TAB_MAP: Partial<Record<ServiceSessionStatus, Tab>> = {
    consultation: "consult",
    in_progress: "formula",
    processing: "cheatsheet",
    finishing: "complete",
  };

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
        // Auto-advance to the relevant tab
        const nextTab = STATUS_TAB_MAP[newStatus];
        if (nextTab) setActiveTab(nextTab);
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
      // Create a structured service task
      await fetch("/api/service-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          assignedTo: session.stylistId,
          taskType: helpType,
          description: helpNote || HELP_OPTIONS.find(h => h.type === helpType)?.label || "Help needed",
          priority: "urgent",
        }),
      });
      // Also set session to needs_help
      await fetch(`/api/services/${session.id}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: helpNote || HELP_OPTIONS.find(h => h.type === helpType)?.label }),
      });
      const res = await fetch("/api/services/active");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions?.[0]) setSession(data.sessions[0]);
      }
      setHelpSent(true);
      setTimeout(() => setHelpSent(false), 3000);
    } catch {}
    setHelpRequesting(false);
    setHelpNote("");
    setHelpOpen(false);
  };

  // Process management
  const addProcess = async () => {
    if (!newProcessName) return;
    try {
      const res = await fetch(`/api/services/${session.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProcessName,
          durationMinutes: newProcessMinutes,
          sequence: (session.processes?.length || 0) + 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch {}
    setNewProcessName("");
    setNewProcessMinutes(30);
    setAddingProcess(false);
  };

  const updateProcessAction = async (processId: string, action: "start" | "pause" | "complete") => {
    try {
      const res = await fetch(`/api/services/${session.id}/process/${processId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch {}
  };

  const removeProcessAction = async (processId: string) => {
    try {
      const res = await fetch(`/api/services/${session.id}/process/${processId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch {}
  };

  // Suggest formula (from inspo or history)
  const fetchSuggestion = async (source: "inspo" | "history") => {
    setSuggestLoading(true);
    setSuggestError("");
    setSuggestOpen(false);
    try {
      const endpoint = source === "inspo"
        ? "/api/intelligence/suggest-formula-from-inspo"
        : "/api/intelligence/suggest-formula";
      const body = source === "inspo"
        ? { clientId: session.clientId }
        : { clientId: session.clientId, serviceTypeName: session.serviceName };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 404) {
        const data = await res.json();
        setSuggestError(data.error || (source === "inspo"
          ? "No completed inspo consultation found."
          : "Not enough formula history yet."));
        return;
      }
      if (!res.ok) {
        setSuggestError("Could not get suggestion right now.");
        return;
      }
      const data = await res.json();
      setSuggestion(data.suggestion || data);
    } catch {
      setSuggestError("Could not reach intelligence service.");
    } finally {
      setSuggestLoading(false);
    }
  };

  // Save inline formula
  const saveFormula = async () => {
    if (!formulaText.trim()) return;
    setFormulaSaving(true);
    try {
      const res = await fetch("/api/formula-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.clientId,
          rawNotes: formulaText,
          serviceDate: new Date().toISOString().split("T")[0],
        }),
      });
      if (res.ok) {
        setFormulaSaved(true);
        setTimeout(() => setFormulaSaved(false), 3000);
      }
    } catch {}
    setFormulaSaving(false);
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

  const processes = session.processes || [];
  const allProcessesComplete = processes.length > 0 && processes.every(p => p.status === "complete");
  const hasActiveProcess = processes.some(p => p.status === "active");

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
          padding: "8px 12px", background: "rgba(117,18,18,0.08)",
          borderBottom: "1px solid rgba(117,18,18,0.2)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "14px" }}>!</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--garnet-ruby)" }}>
            Help requested: {session.helpRequestNote || "Waiting for assistance"}
          </span>
          <button
            onClick={() => updateStatus("in_progress")}
            disabled={statusUpdating}
            style={{
              marginLeft: "auto", padding: "3px 10px", borderRadius: "4px",
              fontSize: "9px", fontWeight: 600, background: "var(--garnet-ruby)", color: "white",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Previous formulas from cheat sheet data */}
            {cheatSheet?.formulaHistory && cheatSheet.formulaHistory.length > 0 && (
              <InfoBlock label="Previous Formulas">
                {cheatSheet.formulaHistory.slice(0, 2).map((f, i) => (
                  <div key={i} style={{
                    padding: "8px", borderRadius: "4px", background: "var(--stone-light)",
                    border: "1px solid var(--stone-mid)", marginBottom: "6px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)" }}>
                        {new Date(f.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <button
                        onClick={() => { setFormulaText(f.notes); }}
                        style={{
                          padding: "2px 8px", borderRadius: "3px", fontSize: "8px", fontWeight: 700,
                          background: "var(--brass-glow)", color: "var(--brass)", border: "1px solid var(--brass-soft)",
                          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em",
                        }}
                      >
                        Remix
                      </button>
                    </div>
                    <p style={{ fontSize: "11px", lineHeight: "1.5", color: "var(--text-on-stone)", whiteSpace: "pre-wrap" }}>
                      {f.notes}
                    </p>
                    {f.general && (
                      <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "4px", fontStyle: "italic" }}>
                        {f.general}
                      </p>
                    )}
                  </div>
                ))}
              </InfoBlock>
            )}

            {/* Suggest Formula — From Inspo / From History */}
            <div>
              {!suggestion && !suggestLoading && (
                <div style={{ marginBottom: "10px" }}>
                  {!suggestOpen ? (
                    <button onClick={() => setSuggestOpen(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "6px 12px", borderRadius: "6px",
                        border: "1px solid var(--stone-warm)", background: "var(--brass-glow)",
                        color: "var(--brass)", fontSize: "10px", fontWeight: 600,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>
                      ✦ Suggest Formula
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button onClick={() => fetchSuggestion("inspo")}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "6px 12px", borderRadius: "6px",
                          border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                          color: "var(--text-on-stone)", fontSize: "10px", fontWeight: 500,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}>
                        📷 From Inspo
                      </button>
                      <button onClick={() => fetchSuggestion("history")}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "6px 12px", borderRadius: "6px",
                          border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                          color: "var(--text-on-stone)", fontSize: "10px", fontWeight: 500,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}>
                        ↻ From History
                      </button>
                      <button onClick={() => setSuggestOpen(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--text-on-stone-faint)", padding: "2px" }}>
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {suggestLoading && (
                <div style={{ padding: "12px", borderRadius: "6px", background: "var(--brass-glow)", border: "1px solid var(--brass-soft)", marginBottom: "10px" }}>
                  <p style={{ fontSize: "10px", color: "var(--brass)", fontWeight: 600 }}>Generating suggestion...</p>
                </div>
              )}

              {suggestError && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", background: "var(--garnet-wash)", border: "1px solid rgba(117,18,18,0.2)", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "10px", color: "var(--garnet)" }}>{suggestError}</p>
                  <button onClick={() => setSuggestError("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text-on-stone-faint)" }}>×</button>
                </div>
              )}

              {suggestion && (
                <div style={{
                  padding: "10px", borderRadius: "6px", background: "rgba(196,171,112,0.06)",
                  border: "1px solid var(--brass-soft)", marginBottom: "10px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Suggested Formula
                    </p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => { setFormulaText(suggestion.suggested_formula); setSuggestion(null); }}
                        style={{
                          padding: "2px 8px", borderRadius: "3px", fontSize: "8px", fontWeight: 700,
                          background: "var(--garnet)", color: "white",
                          border: "none", cursor: "pointer", textTransform: "uppercase",
                        }}>
                        Use This
                      </button>
                      <button onClick={() => setSuggestion(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text-on-stone-faint)" }}>×</button>
                    </div>
                  </div>
                  <p style={{ fontSize: "11px", lineHeight: "1.6", color: "var(--text-on-stone)", whiteSpace: "pre-wrap" }}>
                    {suggestion.suggested_formula}
                  </p>
                  {suggestion.reasoning && (
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginTop: "6px", fontStyle: "italic" }}>
                      {suggestion.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Inline formula entry */}
            <InfoBlock label="Today's Formula">
              <textarea
                value={formulaText}
                onChange={e => { setFormulaText(e.target.value); setFormulaSaved(false); }}
                placeholder="Enter formula notes...&#10;Bowl 1: Product + Developer (ratio)&#10;Process X min"
                rows={5}
                style={{
                  width: "100%", padding: "8px", borderRadius: "4px",
                  border: "1px solid var(--stone-warm)", background: "var(--stone-light)",
                  fontSize: "11px", color: "var(--text-on-stone)",
                  fontFamily: "'DM Sans', sans-serif", resize: "vertical",
                  lineHeight: "1.6",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                <button onClick={saveFormula} disabled={formulaSaving || !formulaText.trim()}
                  style={{
                    padding: "6px 14px", borderRadius: "5px", fontSize: "10px", fontWeight: 700,
                    background: formulaSaved ? "var(--status-confirmed)" : "var(--garnet)",
                    color: "white", border: "none", cursor: "pointer",
                    opacity: !formulaText.trim() ? 0.5 : 1,
                  }}>
                  {formulaSaving ? "Saving..." : formulaSaved ? "Saved ✓" : "Save Formula"}
                </button>
                <a href={`/app/formulas?client=${session.clientId}`}
                  style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", textDecoration: "underline" }}>
                  Full Editor
                </a>
              </div>
            </InfoBlock>
          </div>
        )}

        {activeTab === "photos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Before/After Photos */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Before</p>
                {session.beforePhotoUrl ? (
                  <img src={session.beforePhotoUrl} alt="Before" style={{ width: "100%", borderRadius: "6px", border: "1px solid var(--stone-mid)", aspectRatio: "3/4", objectFit: "cover" }} />
                ) : (
                  <PhotoUploadBox
                    label="Capture Before"
                    onUpload={async (url) => {
                      await fetch(`/api/services/${session.id}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: session.status, beforePhotoUrl: url }),
                      });
                      setSession({ ...session, beforePhotoUrl: url });
                    }}
                    clientId={session.clientId}
                    photoType="before"
                  />
                )}
              </div>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>After</p>
                {session.afterPhotoUrl ? (
                  <img src={session.afterPhotoUrl} alt="After" style={{ width: "100%", borderRadius: "6px", border: "1px solid var(--stone-mid)", aspectRatio: "3/4", objectFit: "cover" }} />
                ) : (
                  <PhotoUploadBox
                    label="Capture After"
                    onUpload={async (url) => {
                      await fetch(`/api/services/${session.id}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: session.status, afterPhotoUrl: url }),
                      });
                      setSession({ ...session, afterPhotoUrl: url });
                    }}
                    clientId={session.clientId}
                    photoType="after"
                    disabled={!["in_progress", "processing", "finishing"].includes(session.status)}
                  />
                )}
              </div>
            </div>

            {/* Client Inspo Photos */}
            {inspoPhotos.length > 0 && (
              <InfoBlock label="Client Inspo Photos">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  {inspoPhotos.map((photo, i) => (
                    <img key={i} src={photo.url} alt={photo.caption || "Inspo"} style={{
                      width: "100%", borderRadius: "4px", border: "1px solid var(--stone-mid)",
                      aspectRatio: "1", objectFit: "cover",
                    }} />
                  ))}
                </div>
              </InfoBlock>
            )}

            {/* Side-by-side comparison */}
            {session.afterPhotoUrl && inspoPhotos.length > 0 && (
              <InfoBlock label="Inspo vs Result">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <p style={{ fontSize: "8px", color: "var(--text-on-stone-ghost)", marginBottom: "2px" }}>INSPO</p>
                    <img src={inspoPhotos[0].url} alt="Inspo" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--stone-mid)", aspectRatio: "3/4", objectFit: "cover" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "8px", color: "var(--text-on-stone-ghost)", marginBottom: "2px" }}>RESULT</p>
                    <img src={session.afterPhotoUrl} alt="Result" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--stone-mid)", aspectRatio: "3/4", objectFit: "cover" }} />
                  </div>
                </div>
              </InfoBlock>
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

      {/* Process Timers — show when processes exist */}
      {processes.length > 0 && (
        <div style={{ borderTop: "1px solid var(--stone-mid)", padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Processes ({processes.filter(p => p.status === "complete").length}/{processes.length})
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {processes.map(proc => (
              <ProcessTimer
                key={proc.id}
                process={proc}
                processes={processes}
                onAction={(action) => updateProcessAction(proc.id, action)}
                onRemove={() => removeProcessAction(proc.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{
        padding: "8px 12px", borderTop: "1px solid var(--stone-mid)",
        display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
      }}>
        {/* Status actions */}
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
        {(session.status === "in_progress" || session.status === "processing") && (
          <>
            {!addingProcess ? (
              <button onClick={() => setAddingProcess(true)} style={actionBtnStyle("var(--brass)")}>
                + Process
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input value={newProcessName} onChange={e => setNewProcessName(e.target.value)}
                  placeholder="Name..." style={inputStyle()} />
                <input type="number" min={1} max={120} value={newProcessMinutes}
                  onChange={e => setNewProcessMinutes(parseInt(e.target.value) || 30)}
                  style={{ ...inputStyle(), width: "40px", textAlign: "center" }} />
                <span style={{ fontSize: "8px", color: "var(--text-on-stone-faint)" }}>min</span>
                <button onClick={addProcess} disabled={!newProcessName} style={actionBtnStyle("var(--garnet)")}>Add</button>
                <button onClick={() => setAddingProcess(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text-on-stone-faint)" }}>×</button>
              </div>
            )}
            {/* Move to processing if not already */}
            {session.status === "in_progress" && processes.length > 0 && (
              <button onClick={() => updateStatus("processing")} disabled={statusUpdating}
                style={actionBtnStyle("var(--brass)")}>
                Start Processing
              </button>
            )}
            {/* Done Processing — only when all processes complete */}
            {session.status === "processing" && allProcessesComplete && (
              <button onClick={() => updateStatus("finishing")} disabled={statusUpdating}
                style={actionBtnStyle("var(--garnet)")}>
                Done Processing
              </button>
            )}
            {/* Skip to finishing if no processes */}
            {session.status === "processing" && processes.length === 0 && (
              <button onClick={() => updateStatus("finishing")} disabled={statusUpdating}
                style={actionBtnStyle("var(--garnet)")}>
                Done
              </button>
            )}
          </>
        )}
        {session.status === "finishing" && (
          <button onClick={() => { setActiveTab("complete"); }} style={actionBtnStyle("var(--garnet)")}>
            Go to Checkout
          </button>
        )}

        {/* Help button — structured task request */}
        {!["checked_in", "complete", "needs_help"].includes(session.status) && (
          <div style={{ marginLeft: "auto", position: "relative" }}>
            {helpSent && (
              <span style={{ fontSize: "9px", color: "var(--status-confirmed)", fontWeight: 600, marginRight: "8px" }}>
                Task sent to floor ✓
              </span>
            )}
            <button onClick={() => setHelpOpen(!helpOpen)}
              style={{
                padding: "4px 10px", borderRadius: "4px", fontSize: "9px",
                fontWeight: 700, background: "var(--garnet-ruby)", color: "white",
                border: "none", cursor: "pointer", textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
              Help
            </button>
            {helpOpen && (
              <div style={{
                position: "absolute", bottom: "100%", right: 0, marginBottom: "4px",
                background: "var(--stone-card)", borderRadius: "6px", padding: "10px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.18)", border: "1px solid var(--stone-mid)",
                minWidth: "200px", zIndex: 50,
              }}>
                <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  What do you need?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                  {HELP_OPTIONS.map(opt => (
                    <button key={opt.type} onClick={() => setHelpType(opt.type as ServiceTaskType)}
                      style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 500,
                        background: helpType === opt.type ? "var(--garnet-wash)" : "transparent",
                        color: helpType === opt.type ? "var(--garnet)" : "var(--text-on-stone)",
                        border: helpType === opt.type ? "1px solid var(--garnet)" : "1px solid var(--stone-mid)",
                        cursor: "pointer", textAlign: "left",
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input value={helpNote} onChange={e => setHelpNote(e.target.value)}
                  placeholder="Additional note..." style={{ ...inputStyle(), width: "100%", marginBottom: "6px" }} />
                <button onClick={requestHelp} disabled={helpRequesting}
                  style={{ ...actionBtnStyle("var(--garnet-ruby)"), width: "100%" }}>
                  {helpRequesting ? "Sending..." : "Send Request"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Help Options ─────────────────────────────────────────────────────
const HELP_OPTIONS = [
  { type: "get_supplies", label: "Need supplies" },
  { type: "check_processing", label: "Check processing" },
  { type: "mix_color", label: "Mix color" },
  { type: "rinse", label: "Rinse" },
  { type: "shampoo", label: "Shampoo" },
  { type: "custom", label: "Other (custom)" },
];

// ── Process Timer ────────────────────────────────────────────────────
function ProcessTimer({ process, processes, onAction, onRemove }: {
  process: ServiceProcess;
  processes: ServiceProcess[];
  onAction: (action: "start" | "pause" | "complete") => void;
  onRemove: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (process.status !== "active" || !process.startedAt) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(process.startedAt!).getTime()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [process.status, process.startedAt]);

  const totalSec = process.durationMinutes * 60;
  const remaining = Math.max(0, totalSec - elapsed);
  const overtime = elapsed > totalSec && totalSec > 0;
  const isBlocked = process.dependsOn ? processes.find(p => p.id === process.dependsOn)?.status !== "complete" : false;

  const statusColor = process.status === "complete" ? "var(--status-confirmed)"
    : process.status === "active" ? (overtime ? "var(--garnet-ruby)" : "var(--brass)")
    : process.status === "paused" ? "var(--stone-shadow)"
    : "var(--stone-deep)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px",
      borderRadius: "4px", background: process.status === "active" ? (overtime ? "var(--garnet-wash)" : "var(--brass-glow)") : "var(--stone-light)",
      border: `1px solid ${process.status === "active" ? (overtime ? "rgba(117,18,18,0.2)" : "var(--brass-soft)") : "var(--stone-mid)"}`,
    }}>
      {isBlocked && <span style={{ fontSize: "10px", color: "var(--stone-shadow)" }} title="Waiting for previous process">🔒</span>}
      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-on-stone)", flex: 1 }}>
        {process.name}
      </span>
      {process.status === "active" && (
        <span style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: statusColor }}>
          {overtime ? "+" : ""}{formatTimer(overtime ? elapsed - totalSec : remaining)}
        </span>
      )}
      {process.status === "complete" && (
        <span style={{ fontSize: "9px", fontWeight: 600, color: statusColor }}>✓</span>
      )}
      {process.status === "waiting" && (
        <span style={{ fontSize: "9px", color: "var(--text-on-stone-ghost)" }}>{process.durationMinutes}m</span>
      )}
      {/* Action buttons */}
      {process.status === "waiting" && !isBlocked && (
        <button onClick={() => onAction("start")} style={tinyBtnStyle("var(--garnet)")}>Start</button>
      )}
      {process.status === "active" && (
        <>
          <button onClick={() => onAction("pause")} style={tinyBtnStyle("var(--stone-shadow)")}>Pause</button>
          <button onClick={() => onAction("complete")} style={tinyBtnStyle("var(--garnet)")}>Done</button>
        </>
      )}
      {process.status === "paused" && (
        <button onClick={() => onAction("start")} style={tinyBtnStyle("var(--brass)")}>Resume</button>
      )}
      {process.status === "waiting" && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "var(--text-on-stone-ghost)", padding: "0 2px" }}>×</button>
      )}
    </div>
  );
}

function tinyBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: "2px 8px", borderRadius: "3px", fontSize: "8px", fontWeight: 700,
    background: bg, color: "white", border: "none", cursor: "pointer",
    textTransform: "uppercase", letterSpacing: "0.04em",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--stone-warm)",
    background: "var(--stone-light)", fontSize: "10px", color: "var(--text-on-stone)",
    fontFamily: "'DM Sans', sans-serif", width: "80px",
  };
}

// ── Photo Upload Box ─────────────────────────────────────────────────
function PhotoUploadBox({ label, onUpload, clientId, photoType, disabled }: {
  label: string;
  onUpload: (url: string) => void;
  clientId: string;
  photoType: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("photo_type", photoType);
      formData.append("client_id", clientId);
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        onUpload(data.url);
      }
    } catch {}
    setUploading(false);
  };

  return (
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      aspectRatio: "3/4", borderRadius: "6px", border: "2px dashed var(--stone-warm)",
      background: "var(--stone-light)", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
    }}>
      <input type="file" accept="image/*" capture="environment" onChange={handleFile}
        disabled={disabled || uploading} style={{ display: "none" }} />
      <span style={{ fontSize: "20px", color: "var(--stone-shadow)", marginBottom: "4px" }}>
        {uploading ? "..." : "📷"}
      </span>
      <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)", textTransform: "uppercase" }}>
        {uploading ? "Uploading" : label}
      </span>
    </label>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function CheatSheetTab({ cheatSheet, loading }: {
  cheatSheet: {
    cheatSheet: CheatSheet;
    aiSummary: string | null;
    formulaHistory?: { date: string; notes: string; general: string | null }[];
    appointmentHistory?: { service: string; date: string; status: string; notes: string | null }[];
  } | null;
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
  const formulas = cheatSheet.formulaHistory || [];
  const appointments = cheatSheet.appointmentHistory || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* AI Summary */}
      {cheatSheet.aiSummary && (
        <div style={{
          padding: "10px", borderRadius: "6px", background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.15)",
        }}>
          <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--garnet-blush)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
            Metis Briefing
          </p>
          <p style={{ fontSize: "11px", lineHeight: "1.5", color: "var(--text-on-stone)" }}>
            {cheatSheet.aiSummary}
          </p>
        </div>
      )}

      {/* Client Notes */}
      {cs.serviceSnapshot?.pattern && (
        <InfoBlock label="Client Notes">
          <p style={{ fontSize: "11px", lineHeight: "1.5", color: "var(--text-on-stone)" }}>
            {cs.serviceSnapshot.pattern}
          </p>
        </InfoBlock>
      )}

      {/* Pronouns */}
      {cs.serviceSnapshot?.preferences && (
        <InfoBlock label="Details">
          <p style={{ fontSize: "11px", color: "var(--text-on-stone)" }}>{cs.serviceSnapshot.preferences}</p>
        </InfoBlock>
      )}

      {/* Tags */}
      {cs.personalizationCues.length > 0 && (
        <InfoBlock label="Tags">
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

      {/* Formula History */}
      {formulas.length > 0 && (
        <InfoBlock label="Formula History">
          {formulas.map((f, i) => (
            <div key={i} style={{
              padding: "8px", borderRadius: "4px", background: "var(--stone-light)",
              border: "1px solid var(--stone-mid)", marginBottom: i < formulas.length - 1 ? "6px" : 0,
            }}>
              <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-on-stone-faint)", marginBottom: "3px" }}>
                {new Date(f.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p style={{ fontSize: "11px", lineHeight: "1.5", color: "var(--text-on-stone)", whiteSpace: "pre-wrap" }}>
                {f.notes}
              </p>
              {f.general && (
                <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "4px", fontStyle: "italic" }}>
                  {f.general}
                </p>
              )}
            </div>
          ))}
        </InfoBlock>
      )}

      {/* Appointment History */}
      {appointments.length > 0 && (
        <InfoBlock label="Recent Appointments">
          {appointments.slice(0, 3).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                background: a.status === "completed" ? "#10B981" : a.status === "scheduled" ? "#3B82F6" : "#9CA3AF",
              }} />
              <span style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                {a.service}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
                {new Date(a.date).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
              {a.notes && (
                <span style={{ fontSize: "9px", color: "var(--text-on-stone-ghost)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.notes}
                </span>
              )}
            </div>
          ))}
        </InfoBlock>
      )}

      {/* Last Visit */}
      {cs.lastVisit && (
        <InfoBlock label="Last Visit">
          <p style={{ fontSize: "11px", color: "var(--text-on-stone)" }}>
            {cs.lastVisit.service} — {new Date(cs.lastVisit.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          </p>
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
