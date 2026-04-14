"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Send, Plus, Menu, X, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import MessageBubble from "./MessageBubble";
import QuickActions from "./QuickActions";
import ModeIndicator from "./ModeIndicator";
import CallaNav from "./CallaNav";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  type?: "text";
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_HOVER = "#5A1F2E";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";

const STARTERS = [
  "Quiz me on hair color theory",
  "Explain the pH scale for hair products",
  "What are the layers of the skin?",
  "Help me study for my state board exam",
];

/* ─── Thinking indicator ─────────────────────────────────────────── */

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 0" }}>
      <span style={{ fontSize: "11px", color: TEXT_FAINT, fontStyle: "italic" }}>
        Calla is thinking
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: GARNET,
            display: "inline-block",
            animation: `callaPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes callaPulse {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

/* ─── Persistence helpers ────────────────────────────────────────── */

async function fetchConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch("/api/calla/conversations");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.conversations || []).map(
      (c: { id: string; title?: string; updatedAt?: string; updated_at?: string }) => ({
        id: c.id,
        title: c.title || "Untitled",
        updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
      })
    );
  } catch {
    return [];
  }
}

async function createConversation(title?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/calla/conversations", {
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

async function persistMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  try {
    await fetch(`/api/calla/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
  } catch {
    // Silently fail — chat still works without persistence
  }
}

async function loadConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const res = await fetch(`/api/calla/conversations/${conversationId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.conversation?.messages || []).map(
      (m: { id: string; role: "user" | "assistant"; content: string; created_at?: string; createdAt?: string }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at || m.createdAt || new Date().toISOString(),
      })
    );
  } catch {
    return [];
  }
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function CallaChat() {
  const router = useRouter();

  /* State */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "quiz" | "flashcard" | "test">("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoTitled = useRef(false);
  const justCreatedConvId = useRef<string | null>(null);

  /* Load conversations on mount */
  useEffect(() => {
    fetchConversations().then(setConversations);
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
    const maxHeight = 4 * 20;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  /* Load conversation messages */
  const loadConversation = useCallback(async (convId: string) => {
    if (convId === activeConversationId) return;
    setLoadingConversation(true);
    setActiveConversationId(convId);
    hasAutoTitled.current = true;
    setMode("chat");

    const msgs = await loadConversationMessages(convId);
    setMessages(msgs);
    setLoadingConversation(false);
  }, [activeConversationId]);

  /* New conversation */
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setMode("chat");
    hasAutoTitled.current = false;
    justCreatedConvId.current = null;
    textareaRef.current?.focus();
  }, []);

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

      // Ensure we have a conversation for persistence
      let convId = activeConversationId;
      if (!convId) {
        const initialTitle =
          trimmed.length > 60 ? trimmed.slice(0, 60) + "..." : trimmed;
        convId = await createConversation(initialTitle);
        if (convId) {
          justCreatedConvId.current = convId;
          setActiveConversationId(convId);
          hasAutoTitled.current = true;
          // Refresh sidebar
          fetchConversations().then(setConversations);
        }
      }

      // Persist user message (fire-and-forget)
      if (convId) {
        persistMessage(convId, "user", trimmed);
      }

      try {
        const conversationHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/calla/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory,
            mode,
          }),
        });

        if (!res.ok) {
          throw new Error("Server error");
        }

        const data = await res.json();

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.reply || "I wasn't able to generate a response. Please try again.",
          timestamp: new Date().toISOString(),
        };

        // Update mode if backend signals a mode change
        if (data.mode && data.mode !== mode) {
          setMode(data.mode);
        }

        setMessages((prev) => [...prev, assistantMsg]);

        // Persist assistant message (fire-and-forget)
        if (convId) {
          persistMessage(convId, "assistant", assistantMsg.content);
          fetchConversations().then(setConversations);
        }
      } catch {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I couldn't reach the server. Please check your connection and try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, mode, activeConversationId]
  );

  /* Quick action handler */
  const handleQuickAction = useCallback(
    (action: string) => {
      if (action === "log") {
        router.push("/app/calla/log");
        return;
      }

      const actionMessages: Record<string, string> = {
        quiz: "Start a quiz",
        flashcards: "Show me flashcards",
        test: "Start a practice test",
      };

      const msg = actionMessages[action];
      if (msg) {
        sendMessage(msg);
      }
    },
    [sendMessage, router]
  );

  /* Key handler */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ─── Render ───────────────────────────────────────────────────── */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        background: "#FAFAF5",
        overflow: "hidden",
      }}
    >
      {/* Top nav tabs */}
      <CallaNav />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ─── Conversation Sidebar ────────────────────────────────── */}
        <div
          style={{
            width: sidebarOpen ? "260px" : "0px",
            minWidth: sidebarOpen ? "260px" : "0px",
            borderRight: sidebarOpen ? `1px solid ${STONE}` : "none",
            background: CREAM,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "width 0.2s ease, min-width 0.2s ease",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${STONE}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                color: TEXT_PRIMARY,
              }}
            >
              Conversations
            </span>
            <button
              onClick={startNewConversation}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: GARNET,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "5px 12px",
                fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = GARNET_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = GARNET;
              }}
            >
              <Plus size={12} />
              New
            </button>
          </div>

          {/* Conversation list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px",
            }}
          >
            {conversations.length === 0 && (
              <p
                style={{
                  fontSize: "11px",
                  color: TEXT_FAINT,
                  textAlign: "center",
                  padding: "20px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                No conversations yet. Start chatting!
              </p>
            )}
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: isActive ? `${GARNET}12` : "transparent",
                    border: isActive
                      ? `1px solid ${GARNET}30`
                      : "1px solid transparent",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    marginBottom: "4px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${STONE}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? GARNET : TEXT_PRIMARY,
                      fontFamily: "'DM Sans', sans-serif",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.title}
                  </p>
                  <p
                    style={{
                      fontSize: "9px",
                      color: TEXT_FAINT,
                      margin: "2px 0 0",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {new Date(conv.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Chat Area ───────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: "12px 20px",
              borderBottom: `1px solid ${STONE}`,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
              background: "#FAFAF5",
            }}
          >
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: TEXT_FAINT,
                borderRadius: "4px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = TEXT_PRIMARY;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = TEXT_FAINT;
              }}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <BookOpen size={16} style={{ color: GARNET }} />
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "16px",
                  color: TEXT_PRIMARY,
                  fontWeight: 500,
                }}
              >
                Calla
              </span>
            </div>

            <ModeIndicator mode={mode} onReset={() => setMode("chat")} />
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Loading state */}
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
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${GARNET} 0%, #8B3A4A 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "4px",
                    fontSize: "22px",
                    color: "#fff",
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 500,
                  }}
                >
                  C
                </div>
                <p
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "18px",
                    color: TEXT_PRIMARY,
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  What would you like to study?
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: TEXT_FAINT,
                    marginBottom: "16px",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Your cosmetology study companion
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "440px",
                  }}
                >
                  {STARTERS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        background: CREAM,
                        border: `1px solid ${STONE}`,
                        borderRadius: "10px",
                        padding: "12px 14px",
                        fontSize: "12px",
                        lineHeight: 1.5,
                        color: TEXT_PRIMARY,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = GARNET;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${GARNET}30`;
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
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}

            {/* Thinking indicator */}
            {sending && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${GARNET} 0%, #8B3A4A 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "13px",
                    color: "#fff",
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 500,
                  }}
                >
                  C
                </div>
                <div
                  style={{
                    background: "#E5E3D3",
                    borderRadius: "14px 14px 14px 4px",
                    borderLeft: `3px solid ${GARNET}`,
                    padding: "10px 14px",
                  }}
                >
                  <ThinkingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions + Input area */}
          <div
            style={{
              padding: "0 24px 16px",
              borderTop: `1px solid ${STONE}`,
              background: "#FAFAF5",
              flexShrink: 0,
            }}
          >
            {/* Quick actions */}
            <div style={{ padding: "12px 0 8px" }}>
              <QuickActions onAction={handleQuickAction} disabled={sending} />
            </div>

            {/* Input box */}
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
                (e.currentTarget as HTMLElement).style.borderColor = GARNET;
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = STONE;
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setInput(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask Calla anything..."
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
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    sending || !input.trim() ? STONE : GARNET,
                  color:
                    sending || !input.trim() ? TEXT_FAINT : "#fff",
                  cursor:
                    sending || !input.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!sending && input.trim()) {
                    e.currentTarget.style.background = GARNET_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sending && input.trim()) {
                    e.currentTarget.style.background = GARNET;
                  }
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
