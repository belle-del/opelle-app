"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, X, Image, History } from "lucide-react";

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
        setError("Could not get suggestion right now.");
        return;
      }

      setSuggestion(await res.json());
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
        </div>
      )}
    </div>
  );
}
