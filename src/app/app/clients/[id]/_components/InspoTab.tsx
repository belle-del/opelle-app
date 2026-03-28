"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Check, X } from "lucide-react";

type StylistIntelligence = {
  whatWasLearned: string;
  appointmentPrep: string;
  keyPreferences: string[];
  potentialChallenges: string[];
  productSuggestions: string[];
};

type AppointmentFlag = {
  severity: "warning" | "critical";
  message: string;
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
};

type InspoSubmission = {
  id: string;
  client_notes: string | null;
  ai_analysis: {
    feasibility: string;
    clientSummary: string;
    stylistFlag: string | null;
    requiresConsult: boolean;
    generatedFormQuestions: { id: string; question: string; type: string; options?: string[] }[];
    demandSignals: { direction: string; productHint?: string; confidence: string }[];
    stylistIntelligence?: StylistIntelligence;
    appointmentFlag?: AppointmentFlag;
  } | null;
  stylist_flag: string | null;
  feasibility: string | null;
  client_summary: string | null;
  requires_consult: boolean;
  reviewed_by_stylist: boolean;
  created_at: string;
  photoUrls: string[];
  consultAnswers?: Record<string, unknown> | null;
};

type Props = {
  clientId: string;
  clientName: string;
  submissions: InspoSubmission[];
};

function getFeasibilityBadge(feasibility: string | null) {
  switch (feasibility) {
    case "straightforward":
      return { label: "Straightforward", variant: "success" as const };
    case "multi_session":
      return { label: "Multi-session", variant: "warning" as const };
    case "needs_consult":
      return { label: "Needs Consult", variant: "danger" as const };
    case "not_recommended":
      return { label: "Not Recommended", variant: "danger" as const };
    default:
      return { label: "Pending", variant: "default" as const };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InspoTab({ clientId, clientName, submissions }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingReviewed, setMarkingReviewed] = useState<string | null>(null);
  const [teachOpenId, setTeachOpenId] = useState<string | null>(null);
  const [teachText, setTeachText] = useState("");
  const [teachType, setTeachType] = useState<"correction" | "note" | "preference">("note");
  const [teachScope, setTeachScope] = useState<"client" | "general">("client");
  const [teachSending, setTeachSending] = useState(false);
  const [teachSentIds, setTeachSentIds] = useState<Set<string>>(new Set());

  async function submitInspoTeach(subId: string, originalContent: string) {
    if (!teachText.trim() || teachSending) return;
    setTeachSending(true);
    try {
      await fetch("/api/intelligence/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "inspo_intelligence",
          sourceId: subId,
          originalContent,
          correction: teachText.trim(),
          feedbackType: teachType,
          entityType: teachScope === "client" ? "client" : "general",
          entityId: teachScope === "client" ? clientId : undefined,
        }),
      });
      setTeachSentIds((prev) => new Set(prev).add(subId));
      setTeachOpenId(null);
      setTeachText("");
    } catch {
      // silently fail
    } finally {
      setTeachSending(false);
    }
  }

  async function handleMarkReviewed(submissionId: string) {
    setMarkingReviewed(submissionId);
    try {
      await fetch(`/api/inspo/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: true }),
      });
      // Optimistic update
      window.location.reload();
    } catch {
      // silent fail
    } finally {
      setMarkingReviewed(null);
    }
  }

  if (submissions.length === 0) {
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
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
        <p className="text-sm text-muted-foreground">
          No inspo submissions from {clientName} yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((sub) => {
        const badge = getFeasibilityBadge(sub.feasibility);
        const isExpanded = expandedId === sub.id;
        const analysis = sub.ai_analysis;

        return (
          <Card key={sub.id}>
            <CardContent className="p-4">
              {/* Header row */}
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  {sub.photoUrls.length > 0 && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      <img
                        src={sub.photoUrls[0]}
                        alt="Inspo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(sub.created_at)}
                      {sub.photoUrls.length > 1 && (
                        <span className="text-muted-foreground">
                          {" "}
                          &middot; {sub.photoUrls.length} photos
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {sub.requires_consult && !sub.reviewed_by_stylist && (
                        <Badge variant="danger">Needs Review</Badge>
                      )}
                      {sub.reviewed_by_stylist && (
                        <Badge variant="success">Reviewed</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {/* Appointment time mismatch flag — shown OUTSIDE expanded view so it's always visible */}
              {analysis?.appointmentFlag && (
                <div
                  className="mt-3 rounded-lg p-4"
                  style={{
                    background: analysis.appointmentFlag.severity === "critical"
                      ? "rgba(74, 26, 46, 0.18)"
                      : "rgba(74, 26, 46, 0.10)",
                    border: analysis.appointmentFlag.severity === "critical"
                      ? "2px solid var(--garnet)"
                      : "1.5px solid rgba(74, 26, 46, 0.3)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: "var(--garnet-wash, rgba(74, 26, 46, 0.15))",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--garnet)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-xs font-bold uppercase tracking-wide mb-1"
                        style={{
                          color: "var(--garnet)",
                        }}
                      >
                        {analysis.appointmentFlag.severity === "critical"
                          ? "REVIEW APPOINTMENT TIME"
                          : "REVIEW APPOINTMENT TIME"}
                      </p>
                      <p className="text-sm" style={{ lineHeight: "1.5" }}>
                        {analysis.appointmentFlag.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Booked: {analysis.appointmentFlag.nextAppointment.serviceName} — {analysis.appointmentFlag.nextAppointment.durationMins} min on{" "}
                        {new Date(analysis.appointmentFlag.nextAppointment.startAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded view */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Photo grid */}
                  {sub.photoUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sub.photoUrls.map((url, i) => (
                        <div
                          key={i}
                          className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-white/10"
                        >
                          <img
                            src={url}
                            alt={`Inspo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stylist flag callout */}
                  {sub.stylist_flag && (
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: sub.requires_consult
                          ? "rgba(68, 6, 6, 0.15)"
                          : "rgba(212, 183, 106, 0.1)",
                        border: sub.requires_consult
                          ? "1px solid var(--garnet)"
                          : "1px solid rgba(212, 183, 106, 0.3)",
                      }}
                    >
                      <p
                        className="text-xs font-medium uppercase tracking-wide mb-1"
                        style={{
                          color: sub.requires_consult
                            ? "var(--garnet)"
                            : "var(--brass)",
                        }}
                      >
                        Stylist Flag
                      </p>
                      <p className="text-sm">{sub.stylist_flag}</p>
                    </div>
                  )}

                  {/* Client notes */}
                  {sub.client_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Client&apos;s Note
                      </p>
                      <p className="text-sm italic">
                        &ldquo;{sub.client_notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Client summary (what the client saw) */}
                  {sub.client_summary && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        AI Summary (shown to client)
                      </p>
                      <p className="text-sm">{sub.client_summary}</p>
                    </div>
                  )}

                  {/* Consult form answers */}
                  {sub.consultAnswers && analysis?.generatedFormQuestions && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Client&apos;s Consult Answers
                      </p>
                      <div className="space-y-2">
                        {analysis.generatedFormQuestions.map((q) => {
                          const answer = sub.consultAnswers?.[q.id];
                          return (
                            <div
                              key={q.id}
                              className="rounded-lg bg-white/5 p-3"
                            >
                              <p className="text-xs text-muted-foreground mb-1">
                                {q.question}
                              </p>
                              <p className="text-sm font-medium">
                                {answer != null
                                  ? String(answer)
                                  : "Not answered"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stylist Intelligence Brief */}
                  {analysis?.stylistIntelligence && (
                    <div
                      className="rounded-lg p-4 space-y-3"
                      style={{
                        background: "linear-gradient(135deg, rgba(196, 171, 112, 0.08), rgba(196, 171, 112, 0.03))",
                        border: "1px solid rgba(196, 171, 112, 0.25)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brass, #C4AB70)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        </svg>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: "var(--brass, #C4AB70)" }}
                        >
                          Stylist Intelligence
                        </p>
                      </div>

                      {/* What was learned */}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          What was learned
                        </p>
                        <p className="text-sm" style={{ lineHeight: "1.5" }}>
                          {analysis.stylistIntelligence.whatWasLearned}
                        </p>
                      </div>

                      {/* Appointment prep */}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          Appointment prep
                        </p>
                        <p className="text-sm" style={{ lineHeight: "1.5" }}>
                          {analysis.stylistIntelligence.appointmentPrep}
                        </p>
                      </div>

                      {/* Key preferences */}
                      {analysis.stylistIntelligence.keyPreferences.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">
                            Key preferences
                          </p>
                          <ul className="space-y-1">
                            {analysis.stylistIntelligence.keyPreferences.map((pref, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span style={{ color: "var(--brass, #C4AB70)", flexShrink: 0 }}>•</span>
                                {pref}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Potential challenges */}
                      {analysis.stylistIntelligence.potentialChallenges.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">
                            Watch for
                          </p>
                          <ul className="space-y-1">
                            {analysis.stylistIntelligence.potentialChallenges.map((ch, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span style={{ color: "var(--garnet)", flexShrink: 0 }}>⚠</span>
                                {ch}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Product suggestions */}
                      {analysis.stylistIntelligence.productSuggestions.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">
                            Product direction
                          </p>
                          <ul className="space-y-1">
                            {analysis.stylistIntelligence.productSuggestions.map((prod, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span style={{ flexShrink: 0 }}>💧</span>
                                {prod}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Teach Metis button */}
                      <div style={{ borderTop: "1px solid rgba(196, 171, 112, 0.2)", paddingTop: "8px" }}>
                        {!teachSentIds.has(sub.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeachOpenId(teachOpenId === sub.id ? null : sub.id);
                              setTeachText("");
                              setTeachType("note");
                              setTeachScope("client");
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "10px",
                              color: teachOpenId === sub.id ? "var(--brass, #C4AB70)" : "var(--text-on-stone-faint, #8A8A7A)",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              transition: "color 0.15s",
                            }}
                          >
                            <MessageSquarePlus size={12} />
                            Teach Metis
                          </button>
                        ) : (
                          <span style={{ fontSize: "10px", color: "var(--brass, #C4AB70)", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Check size={12} /> Noted
                          </span>
                        )}
                        {teachOpenId === sub.id && (
                          <div style={{ marginTop: "8px" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "4px", marginBottom: "6px", flexWrap: "wrap" }}>
                              {(["correction", "note", "preference"] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setTeachType(t)}
                                  style={{
                                    background: teachType === t ? "var(--brass, #C4AB70)" : "transparent",
                                    color: teachType === t ? "#fff" : "var(--text-on-stone, #3A3A32)",
                                    border: `1px solid ${teachType === t ? "var(--brass, #C4AB70)" : "rgba(196,171,112,0.3)"}`,
                                    borderRadius: "12px",
                                    padding: "2px 8px",
                                    fontSize: "9px",
                                    cursor: "pointer",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                              <span style={{ width: "1px", background: "rgba(196,171,112,0.3)", margin: "0 2px" }} />
                              {(["client", "general"] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setTeachScope(s)}
                                  style={{
                                    background: teachScope === s ? "var(--garnet, #6B2737)" : "transparent",
                                    color: teachScope === s ? "#fff" : "var(--text-on-stone-faint, #8A8A7A)",
                                    border: `1px solid ${teachScope === s ? "var(--garnet, #6B2737)" : "rgba(196,171,112,0.3)"}`,
                                    borderRadius: "12px",
                                    padding: "2px 8px",
                                    fontSize: "9px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {s === "general" ? "For everyone" : "For this client"}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
                              <textarea
                                value={teachText}
                                onChange={(e) => setTeachText(e.target.value)}
                                placeholder={
                                  teachType === "correction"
                                    ? "What should Metis know differently?"
                                    : teachType === "preference"
                                      ? "What preference should Metis remember?"
                                      : "Add a note for Metis to learn from..."
                                }
                                rows={2}
                                style={{
                                  flex: 1,
                                  border: "1px solid rgba(196,171,112,0.3)",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  fontSize: "11px",
                                  fontFamily: "'DM Sans', sans-serif",
                                  resize: "none",
                                  outline: "none",
                                  background: "rgba(196,171,112,0.05)",
                                }}
                              />
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <button
                                  onClick={() => submitInspoTeach(sub.id, JSON.stringify(analysis.stylistIntelligence))}
                                  disabled={!teachText.trim() || teachSending}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: teachText.trim() && !teachSending ? "var(--brass, #C4AB70)" : "rgba(196,171,112,0.3)",
                                    color: teachText.trim() && !teachSending ? "#fff" : "var(--text-on-stone-faint, #8A8A7A)",
                                    cursor: teachText.trim() && !teachSending ? "pointer" : "default",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => { setTeachOpenId(null); setTeachText(""); }}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "6px",
                                    border: "1px solid rgba(196,171,112,0.3)",
                                    background: "transparent",
                                    color: "var(--text-on-stone-faint, #8A8A7A)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Demand signals */}
                  {analysis?.demandSignals &&
                    analysis.demandSignals.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Demand Signals
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.demandSignals.map((sig, i) => (
                            <Badge key={i} variant="outline">
                              {sig.direction}
                              {sig.productHint && ` (${sig.productHint})`}
                              {" \u00B7 "}
                              {sig.confidence}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Action row */}
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Link
                      href={`/app/appointments/new?clientId=${clientId}`}
                    >
                      <Button size="sm">Book Consult</Button>
                    </Link>
                    {!sub.reviewed_by_stylist && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkReviewed(sub.id);
                        }}
                        disabled={markingReviewed === sub.id}
                      >
                        {markingReviewed === sub.id
                          ? "Marking..."
                          : "Mark Reviewed"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
