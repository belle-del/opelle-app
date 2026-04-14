"use client";

import React from "react";

const GARNET = "#6B2737";
const TEXT_FAINT = "#8A8A7A";
const STONE = "#E5E3D3";

const MODE_LABELS: Record<string, string> = {
  chat: "Chat",
  quiz: "Quiz",
  flashcard: "Flashcard",
  test: "Practice Test",
};

interface ModeIndicatorProps {
  mode: string;
  onReset: () => void;
}

export default function ModeIndicator({ mode, onReset }: ModeIndicatorProps) {
  const label = MODE_LABELS[mode] || "Chat";
  const isChat = mode === "chat";

  return (
    <button
      onClick={isChat ? undefined : onReset}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: isChat ? "transparent" : `${GARNET}10`,
        border: `1px solid ${isChat ? STONE : GARNET}`,
        borderRadius: "14px",
        padding: "3px 12px",
        fontSize: "11px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        color: isChat ? TEXT_FAINT : GARNET,
        cursor: isChat ? "default" : "pointer",
        transition: "all 0.15s ease",
      }}
      title={isChat ? "Current mode" : "Click to return to chat"}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: isChat ? TEXT_FAINT : GARNET,
        }}
      />
      {label}
      {!isChat && (
        <span style={{ fontSize: "10px", opacity: 0.6 }}>x</span>
      )}
    </button>
  );
}
