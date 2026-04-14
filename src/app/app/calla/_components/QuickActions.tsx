"use client";

import React from "react";

const GARNET = "#6B2737";

const ACTIONS = [
  { label: "Quiz me", action: "quiz" },
  { label: "Flashcards", action: "flashcards" },
  { label: "Practice test", action: "test" },
  { label: "Log practice", action: "log" },
];

interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled: boolean;
}

export default function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        padding: "0 4px",
      }}
    >
      {ACTIONS.map(({ label, action }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={disabled}
          style={{
            background: "transparent",
            border: `1.5px solid ${GARNET}`,
            borderRadius: "20px",
            padding: "6px 16px",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            color: disabled ? "#8A8A7A" : GARNET,
            cursor: disabled ? "default" : "pointer",
            transition: "all 0.15s ease",
            opacity: disabled ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = GARNET;
              e.currentTarget.style.color = "#fff";
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = GARNET;
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
