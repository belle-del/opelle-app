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
              className="text-emerald-400 border-emerald-500/30"
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
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Suggested Formula
                <span className="text-xs text-muted-foreground font-normal">
                  {suggestion.suggestion.based_on === "inspo"
                    ? `(from inspo · ${suggestion.suggestion.inspo_date
                        ? new Date(suggestion.suggestion.inspo_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "recent"})`
                    : suggestion.suggestion.based_on_visits
                      ? `(based on ${suggestion.suggestion.based_on_visits} visits)`
                      : ""}
                </span>
              </p>
              <button
                onClick={() => { setSuggestion(null); setActiveSource(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {suggestion.suggestion.suggested_formula}
            </p>
            <p className="text-xs text-muted-foreground">
              {suggestion.suggestion.reasoning}
            </p>
            {suggestion.suggestion.caution && (
              <p className="text-xs text-amber-400">
                Note: {suggestion.suggestion.caution}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
