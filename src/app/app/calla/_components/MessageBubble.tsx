"use client";

import React from "react";

/* ─── Constants ─────────────────────────────────────────────────── */

const GARNET_BLUSH = "#F5E1E5";
const STONE_LIGHT = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";
const GARNET = "#6B2737";

/* ─── Markdown helpers (safe — no innerHTML) ────────────────────── */

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={`b-${match.index}`} style={{ fontWeight: 600 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      nodes.push(
        <code
          key={`c-${match.index}`}
          style={{
            background: "rgba(107, 39, 55, 0.08)",
            borderRadius: "3px",
            padding: "1px 5px",
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${listKey}`}
          style={{ margin: "6px 0", paddingLeft: "20px", listStyleType: "disc" }}
        >
          {listItems}
        </ul>
      );
      listItems = [];
      listKey++;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <p
          key={`h-${i}`}
          style={{ fontWeight: 600, fontSize: "13px", margin: "10px 0 4px" }}
        >
          {parseInlineMarkdown(trimmed.slice(4))}
        </p>
      );
      return;
    }

    if (/^[-*]\s/.test(trimmed)) {
      listItems.push(
        <li key={`li-${i}`} style={{ marginBottom: "3px", fontSize: "13px", lineHeight: 1.5 }}>
          {parseInlineMarkdown(trimmed.replace(/^[-*]\s/, ""))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(
        <li key={`li-${i}`} style={{ marginBottom: "3px", fontSize: "13px", lineHeight: 1.5 }}>
          {parseInlineMarkdown(trimmed.replace(/^\d+\.\s/, ""))}
        </li>
      );
      return;
    }

    flushList();
    if (trimmed === "") {
      elements.push(<div key={`br-${i}`} style={{ height: "8px" }} />);
    } else {
      elements.push(
        <p key={`p-${i}`} style={{ margin: "3px 0", fontSize: "13px", lineHeight: 1.6 }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <>{elements}</>;
}

/* ─── Timestamp formatter ───────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ─── Component ─────────────────────────────────────────────────── */

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        gap: "8px",
      }}
    >
      {/* Calla avatar */}
      {!isUser && (
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6B2737 0%, #8B3A4A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
            fontSize: "13px",
            color: "#fff",
            fontFamily: "'Fraunces', serif",
            fontWeight: 500,
          }}
        >
          C
        </div>
      )}

      <div style={{ maxWidth: "75%" }}>
        <div
          style={
            isUser
              ? {
                  background: GARNET_BLUSH,
                  borderRadius: "14px 14px 4px 14px",
                  padding: "10px 14px",
                  color: TEXT_PRIMARY,
                  fontSize: "13px",
                  lineHeight: 1.6,
                  fontFamily: "'DM Sans', sans-serif",
                }
              : {
                  background: STONE_LIGHT,
                  borderRadius: "14px 14px 14px 4px",
                  borderLeft: `3px solid ${GARNET}`,
                  padding: "10px 14px",
                  color: TEXT_PRIMARY,
                  fontFamily: "'DM Sans', sans-serif",
                }
          }
        >
          {isUser ? content : renderMarkdown(content)}
        </div>

        <p
          style={{
            fontSize: "9px",
            color: TEXT_FAINT,
            marginTop: "4px",
            textAlign: isUser ? "right" : "left",
            paddingLeft: isUser ? 0 : "4px",
            paddingRight: isUser ? "4px" : 0,
          }}
          title={new Date(timestamp).toLocaleString()}
        >
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
}
