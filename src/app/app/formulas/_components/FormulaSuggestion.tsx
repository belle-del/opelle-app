"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, X } from "lucide-react";

interface FormulaSuggestionProps {
  clientId: string;
  serviceTypeName: string;
}

export function FormulaSuggestion({
  clientId,
  serviceTypeName,
}: FormulaSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    suggestion: {
      based_on_visits: number;
      last_formula_date: string;
      suggested_formula: string;
      reasoning: string;
      confidence: number;
      caution?: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestion() {
    if (!clientId || !serviceTypeName) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/intelligence/suggest-formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, serviceTypeName }),
      });

      if (res.status === 404) {
        setError("Not enough history for a suggestion yet.");
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
      {!suggestion && (
        <Button
          type="button"
          variant="secondary"
          onClick={fetchSuggestion}
          disabled={loading}
          className="text-emerald-400 border-emerald-500/30"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Suggest Formula
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="text-sm text-muted-foreground">{error}</p>
      )}

      {suggestion && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Suggested Formula
                <span className="text-xs text-muted-foreground font-normal">
                  (based on {suggestion.suggestion.based_on_visits} visits)
                </span>
              </p>
              <button
                onClick={() => setSuggestion(null)}
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
