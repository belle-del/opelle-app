"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X, Image, History, MessageSquarePlus, Check, Send, Eye } from "lucide-react";

interface FormulaSuggestionProps {
  clientId: string;
  serviceTypeName: string;
}

type SuggestionSource = "history" | "inspo" | null;

export function FormulaSuggestion({
  clientId,
  serviceTypeName,
}: FormulaSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    suggestion: {
      based_on_visits?: number;
      last_formula_date?: string;
      suggested_formula: string;
      reasoning: string;
      confidence: number;
      caution?: string;
      based_on?: string;
      inspo_date?: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [activeSource, setActiveSource] = useState<SuggestionSource>(null);
  const [teachOpen, setTeachOpen] = useState(false);
  const [teachText, setTeachText] = useState("");
  const [teachType, setTeachType] = useState<"correction" | "note" | "preference">("note");
  const [teachScope, setTeachScope] = useState<"client" | "general">("client");
  const [teachSending, setTeachSending] = useState(false);
  const [teachSent, setTeachSent] = useState(false);

  // Inspo photo popup
  const [inspoPhotos, setInspoPhotos] = useState<string[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<{ category: string; photoIndices: number[] }[] | null>(null);
  const [showInspoModal, setShowInspoModal] = useState(false);

  // Ask Metis follow-up chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function askMetis() {
    const q = chatInput.trim();
    if (!q || chatSending) return;

    setChatSending(true);
    setChatInput("");

    // Build context: include the formula suggestion as conversation history on first message
    const formulaContext = suggestion?.suggestion?.suggested_formula || "";
    const reasoning = suggestion?.suggestion?.reasoning || "";
    const isFirst = chatMessages.length === 0;

    const newUserMsg = { role: "user" as const, content: q };
    setChatMessages((prev) => [...prev, newUserMsg]);

    try {
      // Create a conversation if first message
      let convId = chatConvId;
      if (!convId) {
        const convRes = await fetch("/api/intelligence/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `Formula Q: ${q.length > 40 ? q.slice(0, 40) + "..." : q}` }),
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          convId = convData.conversation?.id || null;
          setChatConvId(convId);
        }
      }

      // On first message, embed formula context in the user's message
      const fullMessage = isFirst
        ? `Regarding this suggested formula:\n\n${formulaContext}\n\nReasoning: ${reasoning}\n\nMy question: ${q}`
        : q;

      const history = isFirst
        ? []
        : chatMessages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/intelligence/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullMessage,
          conversationHistory: history,
          context: { page: "formula_suggestion", clientId },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || "Sorry, I couldn't generate a response.";
        setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        // Persist both messages to conversation
        if (convId) {
          fetch(`/api/intelligence/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "user", content: fullMessage }),
          });
          fetch(`/api/intelligence/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: reply }),
          });
        }
      } else {
        const errData = await res.json().catch(() => null);
        const detail = errData?.error || `HTTP ${res.status}`;
        setChatMessages((prev) => [...prev, { role: "assistant", content: `Metis error: ${detail}` }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setChatSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function submitTeach() {
    if (!teachText.trim() || teachSending) return;
    setTeachSending(true);
    try {
      await fetch("/api/intelligence/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "formula_suggestion",
          originalContent: suggestion?.suggestion?.suggested_formula || "",
          correction: teachText.trim(),
          feedbackType: teachType,
          entityType: teachScope === "client" ? "client" : "general",
          entityId: teachScope === "client" ? clientId : undefined,
        }),
      });
      setTeachSent(true);
      setTeachOpen(false);
      setTeachText("");
    } catch {
      // silently fail
    } finally {
      setTeachSending(false);
    }
  }

  async function fetchSuggestion(source: SuggestionSource) {
    if (!clientId || !source) return;

    setLoading(true);
    setError(null);
    setActiveSource(source);
    setShowPicker(false);

    try {
      const endpoint = source === "inspo"
        ? "/api/intelligence/suggest-formula-from-inspo"
        : "/api/intelligence/suggest-formula";

      const body = source === "inspo"
        ? { clientId }
        : { clientId, serviceTypeName };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 404) {
        const data = await res.json();
        setError(data.error || (source === "inspo"
          ? "No completed inspo consultation found for this client."
          : "Not enough formula history for a suggestion yet."));
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Could not get suggestion right now.");
        return;
      }

      const data = await res.json();
      setSuggestion(data);
      if (source === "inspo") {
        if (data?.suggestion?.photoUrls) setInspoPhotos(data.suggestion.photoUrls);
        if (data?.suggestion?.categoryMeta) setCategoryMeta(data.suggestion.categoryMeta);
      }
    } catch {
      setError("Could not reach intelligence service.");
    } finally {
      setLoading(false);
    }
  }

  if (!clientId || !serviceTypeName) return null;

  return (
    <div className="space-y-3">
      {!suggestion && !loading && (
        <div className="space-y-2">
          {!showPicker ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPicker(true)}
              className="border-[var(--stone-warm)]" style={{ color: "var(--brass)" }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Suggest Formula
            </Button>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => fetchSuggestion("inspo")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--stone-warm)",
                  background: "var(--stone-light)",
                  color: "var(--text-on-stone)",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--garnet-wash, rgba(74,26,46,0.12))";
                  e.currentTarget.style.borderColor = "var(--garnet)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--stone-light)";
                  e.currentTarget.style.borderColor = "var(--stone-warm)";
                }}
              >
                <Image size={14} />
                From Inspo
              </button>
              <button
                type="button"
                onClick={() => fetchSuggestion("history")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--stone-warm)",
                  background: "var(--stone-light)",
                  color: "var(--text-on-stone)",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--garnet-wash, rgba(74,26,46,0.12))";
                  e.currentTarget.style.borderColor = "var(--garnet)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--stone-light)";
                  e.currentTarget.style.borderColor = "var(--stone-warm)";
                }}
              >
                <History size={14} />
                From History
              </button>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-on-stone-faint)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 0",
            color: "var(--text-on-stone-faint)",
            fontSize: "12px",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {activeSource === "inspo"
            ? "Analyzing inspo + history..."
            : "Reviewing formula history..."}
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setActiveSource(null); }}
            style={{ color: "var(--text-on-stone-faint)", cursor: "pointer", background: "none", border: "none" }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {suggestion && (
        <div
          style={{
            border: "1px solid var(--stone-warm)",
            borderRadius: "10px",
            overflow: "hidden",
            background: "var(--stone-card)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: "1px solid var(--stone-mid)",
              background: "rgba(74,26,46,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={14} style={{ color: "var(--brass)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-on-stone)", fontFamily: "'Fraunces', serif" }}>
                Suggested Formula
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
                {suggestion.suggestion.based_on === "inspo"
                  ? `from inspo · ${suggestion.suggestion.inspo_date
                      ? new Date(suggestion.suggestion.inspo_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "recent"}`
                  : suggestion.suggestion.based_on_visits
                    ? `based on ${suggestion.suggestion.based_on_visits} visits`
                    : ""}
              </span>
              {inspoPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInspoModal(true)}
                  style={{
                    background: "none",
                    border: "1px solid var(--stone-warm)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 8px",
                    fontSize: "9px",
                    color: "var(--brass)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--garnet-wash, rgba(74,26,46,0.08))";
                    e.currentTarget.style.borderColor = "var(--brass)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.borderColor = "var(--stone-warm)";
                  }}
                >
                  <Eye size={10} />
                  View Inspo
                </button>
              )}
            </div>
            <button
              onClick={() => { setSuggestion(null); setActiveSource(null); }}
              style={{ color: "var(--text-on-stone-faint)", cursor: "pointer", background: "none", border: "none", padding: "2px" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Formula steps */}
          <div style={{ padding: "12px 14px" }}>
            {suggestion.suggestion.suggested_formula
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => {
                const isStep = /^(Bowl|Toner|Gloss|Application|Notes|Root|Mid|Ends|Step)/i.test(line.trim());
                return (
                  <div
                    key={i}
                    style={{
                      padding: "6px 0",
                      borderBottom: i < suggestion.suggestion.suggested_formula.split("\n").filter(l => l.trim()).length - 1
                        ? "1px solid var(--stone-mid)"
                        : "none",
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-start",
                    }}
                  >
                    {isStep && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "var(--brass)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          minWidth: "fit-content",
                          marginTop: "2px",
                          flexShrink: 0,
                        }}
                      >
                        {line.split(":")[0].trim()}:
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "var(--text-on-stone)", lineHeight: "1.5" }}>
                      {isStep ? line.split(":").slice(1).join(":").trim() : line.trim()}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Reasoning */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--stone-mid)",
              background: "rgba(74,26,46,0.03)",
            }}
          >
            <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", lineHeight: "1.5" }}>
              {suggestion.suggestion.reasoning}
            </p>
            {suggestion.suggestion.caution && (
              <p style={{ fontSize: "11px", color: "var(--garnet)", marginTop: "6px", lineHeight: "1.5" }}>
                ⚠ {suggestion.suggestion.caution}
              </p>
            )}
          </div>

          {/* Teach Metis */}
          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--stone-mid)", display: "flex", alignItems: "center", gap: "8px" }}>
            {!teachSent ? (
              <button
                type="button"
                onClick={() => setTeachOpen(!teachOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: teachOpen ? "var(--brass)" : "var(--text-on-stone-faint)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  transition: "color 0.15s",
                }}
              >
                <MessageSquarePlus size={12} />
                Teach Metis
              </button>
            ) : (
              <span style={{ fontSize: "10px", color: "var(--brass)", display: "flex", alignItems: "center", gap: "3px" }}>
                <Check size={12} /> Noted
              </span>
            )}
          </div>
          {teachOpen && (
            <div style={{ padding: "0 14px 12px" }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px", flexWrap: "wrap" }}>
                {(["correction", "note", "preference"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeachType(t)}
                    style={{
                      background: teachType === t ? "var(--brass)" : "transparent",
                      color: teachType === t ? "#fff" : "var(--text-on-stone)",
                      border: `1px solid ${teachType === t ? "var(--brass)" : "var(--stone-warm)"}`,
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
                <span style={{ width: "1px", background: "var(--stone-warm)", margin: "0 2px" }} />
                {(["client", "general"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTeachScope(s)}
                    style={{
                      background: teachScope === s ? "var(--garnet)" : "transparent",
                      color: teachScope === s ? "#fff" : "var(--text-on-stone-faint)",
                      border: `1px solid ${teachScope === s ? "var(--garnet)" : "var(--stone-warm)"}`,
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
                      ? "What should Metis have suggested instead?"
                      : teachType === "preference"
                        ? "What preference should Metis remember?"
                        : "Add a note for Metis to learn from..."
                  }
                  rows={2}
                  style={{
                    flex: 1,
                    border: "1px solid var(--stone-warm)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontFamily: "'DM Sans', sans-serif",
                    resize: "none",
                    outline: "none",
                    background: "var(--stone-light, #FAFAF5)",
                    color: "var(--text-on-stone)",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button
                    type="button"
                    onClick={submitTeach}
                    disabled={!teachText.trim() || teachSending}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      border: "none",
                      background: teachText.trim() && !teachSending ? "var(--brass)" : "var(--stone-warm)",
                      color: teachText.trim() && !teachSending ? "#fff" : "var(--text-on-stone-faint)",
                      cursor: teachText.trim() && !teachSending ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTeachOpen(false); setTeachText(""); }}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      border: "1px solid var(--stone-warm)",
                      background: "transparent",
                      color: "var(--text-on-stone-faint)",
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

          {/* Ask Metis follow-up */}
          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--stone-mid)" }}>
            {!chatOpen ? (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: "var(--text-on-stone-faint)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--brass)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-on-stone-faint)"; }}
              >
                <Sparkles size={12} />
                Ask Metis about this formula
              </button>
            ) : (
              <div>
                {/* Chat messages */}
                {chatMessages.length > 0 && (
                  <div style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div style={{
                          maxWidth: "85%",
                          padding: "6px 10px",
                          borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                          background: msg.role === "user" ? "var(--stone-warm, #E5E3D3)" : "var(--cream, #F1EFE0)",
                          borderLeft: msg.role === "assistant" ? "2px solid var(--brass, #C4AB70)" : "none",
                          fontSize: "11px",
                          lineHeight: "1.5",
                          color: "var(--text-on-stone, #3A3A32)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatSending && (
                      <div style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", fontStyle: "italic" }}>
                        Metis is thinking...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Chat input */}
                <div style={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askMetis(); } }}
                    placeholder="Ask a follow-up about this formula..."
                    style={{
                      flex: 1,
                      border: "1px solid var(--stone-warm)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                      background: "var(--stone-light, #FAFAF5)",
                      color: "var(--text-on-stone)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={askMetis}
                    disabled={!chatInput.trim() || chatSending}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "none",
                      background: chatInput.trim() && !chatSending ? "var(--brass)" : "var(--stone-warm)",
                      color: chatInput.trim() && !chatSending ? "#fff" : "var(--text-on-stone-faint)",
                      cursor: chatInput.trim() && !chatSending ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Send size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChatOpen(false); }}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "1px solid var(--stone-warm)",
                      background: "transparent",
                      color: "var(--text-on-stone-faint)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
                {chatConvId && chatMessages.length > 0 && (
                  <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginTop: "4px" }}>
                    Saved to Metis chat history
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Inspo photo modal */}
      {showInspoModal && inspoPhotos.length > 0 && (
        <div
          onClick={() => setShowInspoModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--stone-card, #F5F3E8)",
              borderRadius: "12px",
              maxWidth: "520px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--stone-mid)",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)" }}>
                Inspo Reference Photos
              </span>
              <button
                type="button"
                onClick={() => setShowInspoModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-on-stone-faint)", padding: "2px" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{
              padding: "16px",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: inspoPhotos.length === 1 ? "1fr" : "1fr 1fr",
              gap: "10px",
            }}>
              {inspoPhotos.map((url, i) => {
                const cat = categoryMeta?.find((c) => c.photoIndices.includes(i));
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={url}
                      alt={`Inspo photo ${i + 1}`}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        objectFit: "cover",
                        aspectRatio: "1",
                        border: "1px solid var(--stone-warm)",
                      }}
                    />
                    {cat && (
                      <span style={{
                        position: "absolute",
                        bottom: "6px",
                        left: "6px",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        fontSize: "9px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.02em",
                        textTransform: "capitalize",
                      }}>
                        {cat.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
