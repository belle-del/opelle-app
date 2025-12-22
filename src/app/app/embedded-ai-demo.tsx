"use client";

import { useState } from "react";
import { runAiTask } from "@/lib/ai/provider";
import type { AiResult } from "@/lib/ai/types";

export default function EmbeddedAiDemo({ enabled }: { enabled: boolean }) {
  const [output, setOutput] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await runAiTask("next_actions", {
        clientName: "Avery Chen",
        service: "Signature Glow Facial",
        notes: "Focus on hydration and barrier repair.",
      });
      setOutput(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!enabled || loading}
        className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {loading ? "Generating..." : "Generate Next Actions (Local)"}
      </button>

      {!enabled ? (
        <p className="text-sm text-amber-200">
          Embedded AI is disabled. Set OPLE_EMBEDDED_AI_ENABLED=true to enable
          it.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-300">Error: {error}</p>
      ) : null}

      {output ? (
        <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">
          {JSON.stringify(output, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-slate-400">
          No output yet. Generate next actions to preview deterministic JSON.
        </p>
      )}
    </div>
  );
}
