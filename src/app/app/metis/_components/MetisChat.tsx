"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Sparkles, Send } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface MetisChatContext {
  page?: string;
  clientId?: string;
  clientName?: string;
  productId?: string;
  productName?: string;
  formulaId?: string;
}

interface MetisChatProps {
  fullPage?: boolean;
  context?: MetisChatContext;
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  onMessageSent?: () => void;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const BRASS = "#C4AB70";
const BRASS_HOVER = "#b89c5e";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const GARNET = "#6B2737";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";

const FALLBACK_STARTERS = [
  "Who's due for a rebook this week?",
  "What products are running low?",
  "Suggest a formula for warm copper tones",
  "How do I price a balayage service?",
];

/* ─── Markdown helpers (safe — no innerHTML) ─────────────────────── */

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match **bold** and `code` inline patterns
  const regex = /(\*\*(.+?)\*\*|`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold
      nodes.push(
        <strong key={`b-${match.index}`} style={{ fontWeight: 600 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Code
      nodes.push(
        <code
          key={`c-${match.index}`}
          style={{
            background: "rgba(196, 171, 112, 0.15)",
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

    // Headers (### -> bold text)
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

    // Bullet list items
    if (/^[-*]\s/.test(trimmed)) {
      listItems.push(
        <li key={`li-${i}`} style={{ marginBottom: "3px", fontSize: "12px", lineHeight: 1.5 }}>
          {parseInlineMarkdown(trimmed.replace(/^[-*]\s/, ""))}
        </li>
      );
      return;
    }

    // Normal text or empty line
    flushList();
    if (trimmed === "") {
      elements.push(<div key={`br-${i}`} style={{ height: "8px" }} />);
    } else {
      elements.push(
        <p key={`p-${i}`} style={{ margin: "3px 0", fontSize: "12px", lineHeight: 1.6 }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <>{elements}</>;
}

/* ─── Thinking indicator ─────────────────────────────────────────── */

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 0" }}>
      <span style={{ fontSize: "11px", color: TEXT_FAINT, fontStyle: "italic" }}>
        Metis is thinking
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: BRASS,
            display: "inline-block",
            animation: `metisPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes metisPulse {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

/* ─── Timestamp formatter ────────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday ? time : `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

/* ─── Persistence helpers ────────────────────────────────────────── */

async function createConversation(title?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/intelligence/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "New conversation" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.conversation?.id || null;
  } catch {
    return null;
  }
}

async function persistMessage(conversationId: string, role: "user" | "assistant", content: string) {
  try {
    await fetch(`/api/intelligence/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
  } catch {
    // Silently fail — chat still works without persistence
  }
}

async function updateConversationTitle(conversationId: string, title: string) {
  try {
    await fetch(`/api/intelligence/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  } catch {
    // Silently fail
  }
}

async function loadConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const res = await fetch(`/api/intelligence/conversations/${conversationId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.conversation?.messages || []).map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at,
    }));
  } catch {
    return [];
  }
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function MetisChat({
  fullPage = false,
  context,
  conversationId: externalConversationId = null,
  onConversationCreated,
  onMessageSent,
}: MetisChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [startersLoading, setStartersLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(externalConversationId ?? null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const hasAutoTitled = useRef(false);
  const justCreatedConvId = useRef<string | null>(null); // Track self-created conversations

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Track external conversationId changes */
  useEffect(() => {
    const newId = externalConversationId ?? null;
    setActiveConvId(newId);
    hasAutoTitled.current = false;

    // Skip reloading if we just created this conversation ourselves
    // (messages are already in React state and may not be persisted yet)
    if (newId && newId === justCreatedConvId.current) {
      justCreatedConvId.current = null;
      hasAutoTitled.current = true;
      return;
    }

    if (newId) {
      setLoadingConversation(true);
      loadConversationMessages(newId).then((msgs) => {
        setMessages(msgs);
        setLoadingConversation(false);
        setSuggestedFollowUps([]);
        if (msgs.length > 0) hasAutoTitled.current = true;
      });
    } else {
      setMessages([]);
      setSuggestedFollowUps([]);
    }
  }, [externalConversationId]);

  /* Fetch dynamic starter prompts */
  useEffect(() => {
    fetch("/api/intelligence/starters")
      .then(r => r.json())
      .then(data => {
        if (data.starters?.length > 0) setStarters(data.starters);
        else setStarters(FALLBACK_STARTERS);
      })
      .catch(() => {
        setStarters(FALLBACK_STARTERS);
      })
      .finally(() => setStartersLoading(false));
  }, []);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  /* Auto-resize textarea */
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = 4 * 20; // ~4 lines
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  /* Send message */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);
      setSuggestedFollowUps([]);

      // Ensure we have a conversation for persistence (full-page only)
      let convId = activeConvId;
      if (fullPage && !convId) {
        // Create conversation with user's first message as the title
        const initialTitle = trimmed.length > 60 ? trimmed.slice(0, 60) + "..." : trimmed;
        convId = await createConversation(initialTitle);
        if (convId) {
          justCreatedConvId.current = convId; // Prevent useEffect from wiping messages
          setActiveConvId(convId);
          hasAutoTitled.current = true; // Already titled from creation
          onConversationCreated?.(convId);
        }
      }

      // Persist user message
      if (fullPage && convId) {
        persistMessage(convId, "user", trimmed);
      }

      try {
        const conversationHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/intelligence/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory,
            context: context ?? {},
          }),
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        const data = await res.json();

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply || "I wasn't able to generate a response. Please try again.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Persist assistant message
        if (fullPage && convId) {
          persistMessage(convId, "assistant", assistantMsg.content);

          // Auto-title: after first assistant response, set title from first user message
          if (!hasAutoTitled.current) {
            hasAutoTitled.current = true;
            const autoTitle = trimmed.length > 60 ? trimmed.slice(0, 60) + "..." : trimmed;
            updateConversationTitle(convId, autoTitle);
          }

          // Notify parent to refresh sidebar
          onMessageSent?.();
        }

        if (data.suggestedFollowUps?.length) {
          setSuggestedFollowUps(data.suggestedFollowUps);
        }
      } catch {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I couldn't reach the server. Please check your connection and try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, context, activeConvId, fullPage, onConversationCreated, onMessageSent]
  );

  /* Key handler */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ─── Container style ─────────────────────────────────────────── */

  const containerStyle: React.CSSProperties = fullPage
    ? {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#FAFAF5",
        borderRadius: "12px",
        boxShadow: "0 0 20px rgba(196, 171, 112, 0.15)",
        overflow: "hidden",
      }
    : {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#FAFAF5",
        overflow: "hidden",
      };

  /* ─── Render ───────────────────────────────────────────────────── */

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes metisShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: fullPage ? "20px 24px" : "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Loading state for conversation */}
        {loadingConversation && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThinkingDots />
          </div>
        )}

        {/* Empty state — starter prompts */}
        {messages.length === 0 && !sending && !loadingConversation && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "40px 0",
            }}
          >
            <Sparkles size={28} style={{ color: BRASS, marginBottom: "4px" }} />
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "16px",
                color: TEXT_PRIMARY,
                fontWeight: 400,
              }}
            >
              How can I help today?
            </p>
            <p style={{ fontSize: "11px", color: TEXT_FAINT, marginBottom: "12px" }}>
              Ask me anything about your studio
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                width: "100%",
                maxWidth: "420px",
              }}
            >
              {startersLoading
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: STONE,
                        border: `1px solid ${STONE}`,
                        borderRadius: "10px",
                        padding: "12px 14px",
                        height: "56px",
                        opacity: 0.5,
                        animation: "metisShimmer 1.5s ease-in-out infinite",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))
                : starters.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        background: CREAM,
                        border: `1px solid ${STONE}`,
                        borderRadius: "10px",
                        padding: "12px 14px",
                        fontSize: "11px",
                        lineHeight: 1.5,
                        color: TEXT_PRIMARY,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = BRASS;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${BRASS}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = STONE;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            {/* Metis avatar */}
            {msg.role === "assistant" && (
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: CREAM,
                  border: `1px solid ${STONE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Sparkles size={12} style={{ color: BRASS }} />
              </div>
            )}

            <div style={{ maxWidth: "75%" }}>
              <div
                style={
                  msg.role === "user"
                    ? {
                        background: STONE,
                        borderRadius: "14px 14px 4px 14px",
                        padding: "10px 14px",
                        color: TEXT_PRIMARY,
                        fontSize: "12px",
                        lineHeight: 1.6,
                      }
                    : {
                        background: CREAM,
                        borderRadius: "14px 14px 14px 4px",
                        borderLeft: `3px solid ${BRASS}`,
                        padding: "10px 14px",
                        color: TEXT_PRIMARY,
                      }
                }
              >
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
              </div>
              <p
                style={{
                  fontSize: "9px",
                  color: TEXT_FAINT,
                  marginTop: "4px",
                  textAlign: msg.role === "user" ? "right" : "left",
                  paddingLeft: msg.role === "assistant" ? "4px" : 0,
                  paddingRight: msg.role === "user" ? "4px" : 0,
                }}
              >
                {formatTimestamp(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {sending && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: CREAM,
                border: `1px solid ${STONE}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={12} style={{ color: BRASS }} />
            </div>
            <div
              style={{
                background: CREAM,
                borderRadius: "14px 14px 14px 4px",
                borderLeft: `3px solid ${BRASS}`,
                padding: "10px 14px",
              }}
            >
              <ThinkingDots />
            </div>
          </div>
        )}

        {/* Suggested follow-ups */}
        {suggestedFollowUps.length > 0 && !sending && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
              flexShrink: 0,
            }}
          >
            {suggestedFollowUps.map((followUp) => (
              <button
                key={followUp}
                onClick={() => sendMessage(followUp)}
                style={{
                  background: "transparent",
                  border: `1px solid ${BRASS}`,
                  borderRadius: "16px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  color: GARNET,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${BRASS}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {followUp}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: fullPage ? "12px 24px 16px" : "10px 16px 12px",
          borderTop: `1px solid ${STONE}`,
          background: "#FAFAF5",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            background: CREAM,
            border: `1px solid ${STONE}`,
            borderRadius: "12px",
            padding: "8px 12px",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = BRASS;
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = STONE;
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Metis anything..."
            disabled={sending}
            rows={1}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              resize: "none",
              outline: "none",
              fontSize: "13px",
              lineHeight: "20px",
              fontFamily: "'DM Sans', sans-serif",
              color: TEXT_PRIMARY,
              maxHeight: "80px",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "none",
              background: sending || !input.trim() ? STONE : BRASS,
              color: sending || !input.trim() ? TEXT_FAINT : "#fff",
              cursor: sending || !input.trim() ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!sending && input.trim()) {
                e.currentTarget.style.background = BRASS_HOVER;
              }
            }}
            onMouseLeave={(e) => {
              if (!sending && input.trim()) {
                e.currentTarget.style.background = BRASS;
              }
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
