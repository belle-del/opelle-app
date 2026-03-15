"use client";

import { Sparkles, X } from "lucide-react";
import Link from "next/link";

interface Suggestion {
  id: string;
  priority: "proactive" | "quiet";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface MentisSuggestionCardProps {
  suggestion: Suggestion;
  onDismiss: (id: string) => void;
}

export function MentisSuggestionCard({ suggestion, onDismiss }: MentisSuggestionCardProps) {
  return (
    <div
      style={{
        borderLeft: "3px solid #C4AB70",
        backgroundColor: "#F1EFE0",
        padding: "12px 14px",
        borderRadius: "8px",
        marginBottom: "8px",
        position: "relative",
      }}
    >
      <button
        onClick={() => onDismiss(suggestion.id)}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px",
          lineHeight: 0,
        }}
        aria-label="Dismiss suggestion"
      >
        <X size={14} color="#999" />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", paddingRight: "20px" }}>
        <Sparkles size={14} color="#C4AB70" />
        <span
          style={{
            fontWeight: 700,
            fontSize: "13px",
            fontFamily: "DM Sans, sans-serif",
            color: "#1a1a1a",
          }}
        >
          {suggestion.title}
        </span>
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "#666",
          margin: "0 0 0 0",
          lineHeight: "1.4",
        }}
      >
        {suggestion.body}
      </p>

      {suggestion.actionLabel && suggestion.actionUrl && (
        <div style={{ marginTop: "8px" }}>
          <Link
            href={suggestion.actionUrl}
            style={{
              fontSize: "12px",
              color: "#C4AB70",
              textDecoration: "underline",
              fontWeight: 500,
            }}
          >
            {suggestion.actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
