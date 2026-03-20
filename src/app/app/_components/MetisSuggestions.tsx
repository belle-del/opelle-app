"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { MetisSuggestionCard } from "./MetisSuggestionCard";

interface Suggestion {
  id: string;
  priority: "proactive" | "quiet";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface MetisSuggestionsProps {
  page: string;
  entityType?: "client" | "product" | "formula" | "dashboard";
  entityData?: Record<string, unknown>;
}

const DISMISSED_KEY = "metis-dismissed";

function getDismissedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
}

function saveDismissedSet(set: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function MetisSuggestions({ page, entityType, entityData }: MetisSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);

  useEffect(() => {
    setDismissed(getDismissedSet());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSuggestions() {
      try {
        const res = await fetch("/api/intelligence/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, entityType, entityData }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // silently fail — suggestions are supplemental
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [page, entityType, entityData]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedSet(next);
      return next;
    });
  }, []);

  if (!loaded) return null;

  const proactive = suggestions.filter((s) => s.priority === "proactive" && !dismissed.has(s.id));
  const quiet = suggestions.filter((s) => s.priority === "quiet" && !dismissed.has(s.id));

  if (proactive.length === 0 && quiet.length === 0) return null;

  return (
    <div style={{ marginBottom: "8px" }}>
      {proactive.map((s) => (
        <MetisSuggestionCard key={s.id} suggestion={s} onDismiss={handleDismiss} />
      ))}

      {quiet.length > 0 && !showQuiet && (
        <button
          onClick={() => setShowQuiet(true)}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "metis-pulse 2s ease-in-out infinite",
          }}
          aria-label="Show more suggestions from Metis"
        >
          <Sparkles size={16} color="#C4AB70" />
          <style>{`
            @keyframes metis-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.1); }
            }
          `}</style>
        </button>
      )}

      {showQuiet && quiet.map((s) => (
        <MetisSuggestionCard key={s.id} suggestion={s} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
