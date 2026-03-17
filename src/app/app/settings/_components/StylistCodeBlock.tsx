"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  workspaceId: string | undefined;
  initialCode: string | null;
};

export function StylistCodeBlock({ workspaceId, initialCode }: Props) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!workspaceId) return;
    setRegenerating(true);

    try {
      const res = await fetch("/api/settings/regenerate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setCode(data.code);
      }
    } catch {
      // silent fail
    } finally {
      setRegenerating(false);
      setShowConfirm(false);
    }
  }

  async function generateCode() {
    if (!workspaceId) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/settings/regenerate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setCode(data.code);
      }
    } catch {
      // silent fail
    } finally {
      setRegenerating(false);
    }
  }

  if (!code) {
    return (
      <div className="space-y-3">
        <p style={{ fontSize: 12, color: "var(--text-on-stone-faint)" }}>
          No stylist code generated yet.
        </p>
        <Button variant="secondary" size="sm" onClick={generateCode} disabled={regenerating}>
          {regenerating ? "Generating..." : "Generate Code"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Code display */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 text-center py-3 rounded-lg"
          style={{
            background: "rgba(0,0,0,0.06)",
            fontFamily: "monospace",
            fontSize: "24px",
            letterSpacing: "0.25em",
            color: "var(--text-on-stone)",
            fontWeight: 600,
          }}
        >
          {code}
        </div>
        <Button variant="secondary" size="md" onClick={copyCode}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      {/* QR Code placeholder — generated client-side from the code string */}
      <div className="flex items-center gap-3">
        <div
          className="w-24 h-24 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid var(--stone-mid)" }}
        >
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--stone-shadow)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" />
              <path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" />
            </svg>
            <p style={{ fontSize: "8px", color: "var(--stone-shadow)", marginTop: "4px" }}>QR Code</p>
          </div>
        </div>
        <div>
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-dim)" }}>
            Share this code with your clients so they can connect with you on Opelle.
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", marginTop: "4px" }}>
            They&apos;ll enter it at <span style={{ fontFamily: "monospace" }}>/client/join</span>
          </p>
        </div>
      </div>

      {/* Regenerate */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-on-stone-faint)",
            fontSize: "11px",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Regenerate Code
        </button>
      ) : (
        <div
          className="p-3 rounded-lg space-y-2"
          style={{ background: "rgba(68,6,6,0.05)", border: "1px solid rgba(68,6,6,0.15)" }}
        >
          <p style={{ fontSize: "12px", color: "var(--garnet)" }}>
            Old code will stop working immediately. Clients who haven&apos;t signed up yet will need the new code.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? "Regenerating..." : "Confirm Regenerate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
