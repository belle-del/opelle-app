"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MessageSquare, Trash2, Menu, Sparkles } from "lucide-react";
import MentisChat from "./_components/MentisChat";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const GARNET = "#6B2737";
const GARNET_DARK = "#440606";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";

/* ─── Relative date formatter ────────────────────────────────────── */

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ─── Page Component ─────────────────────────────────────────────── */

export default function MentisPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Fetch conversation list */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll every 5 seconds to keep sidebar fresh (titles, timestamps, new convos)
  useEffect(() => {
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  /* Start new chat */
  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  /* When MetisChat creates a conversation */
  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    // Re-fetch list to include the new conversation
    fetchConversations();
  }, [fetchConversations]);

  /* Delete a conversation */
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/intelligence/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  }, [activeConversationId]);

  /* Responsive: detect mobile */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showSidebar = isMobile ? sidebarOpen : true;

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 80px)",
        maxWidth: "1100px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle sidebar"
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            zIndex: 20,
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: `1px solid ${STONE}`,
            background: CREAM,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Menu size={18} color={TEXT_PRIMARY} />
        </button>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div
          style={{
            width: "240px",
            minWidth: "240px",
            borderRight: `1px solid ${STONE}`,
            background: CREAM,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            ...(isMobile
              ? {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 15,
                  boxShadow: "4px 0 16px rgba(0,0,0,0.1)",
                }
              : {}),
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "16px",
              borderBottom: `1px solid ${STONE}`,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={18} style={{ color: BRASS }} />
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "16px",
                fontWeight: 400,
                color: TEXT_PRIMARY,
                flex: 1,
              }}
            >
              Metis
            </span>
          </div>

          {/* New Chat button */}
          <div style={{ padding: "12px" }}>
            <button
              onClick={() => {
                handleNewChat();
                if (isMobile) setSidebarOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: `linear-gradient(135deg, ${GARNET}, ${GARNET_DARK})`,
                color: "#fff",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 8px 12px",
            }}
          >
            {loadingList ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: TEXT_FAINT }}>Loading...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <MessageSquare size={24} style={{ color: STONE, margin: "0 auto 8px" }} />
                <p style={{ fontSize: "11px", color: TEXT_FAINT, lineHeight: 1.5 }}>
                  No conversations yet. Start a new chat!
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: isActive ? "rgba(196, 171, 112, 0.15)" : "transparent",
                      borderLeft: isActive ? `3px solid ${BRASS}` : "3px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                      transition: "background 0.15s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(196, 171, 112, 0.08)";
                      const del = e.currentTarget.querySelector("[data-delete]") as HTMLElement;
                      if (del) del.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                      const del = e.currentTarget.querySelector("[data-delete]") as HTMLElement;
                      if (del) del.style.opacity = "0";
                    }}
                  >
                    <MessageSquare size={14} style={{ color: TEXT_FAINT, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: TEXT_PRIMARY,
                          fontWeight: isActive ? 500 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          lineHeight: 1.3,
                        }}
                      >
                        {conv.title}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: TEXT_FAINT,
                          marginTop: "2px",
                        }}
                      >
                        {relativeDate(conv.updated_at)}
                      </p>
                    </div>
                    <div
                      data-delete
                      onClick={(e) => handleDelete(conv.id, e)}
                      style={{
                        opacity: 0,
                        padding: "4px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {deletingId === conv.id ? (
                        <span style={{ fontSize: "10px", color: TEXT_FAINT }}>...</span>
                      ) : (
                        <Trash2 size={13} style={{ color: TEXT_FAINT }} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minWidth: 0,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${STONE}`,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
            background: "#FAFAF5",
            paddingLeft: isMobile ? "56px" : "24px",
          }}
        >
          <Sparkles size={20} style={{ color: BRASS }} />
          <div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "20px",
                fontWeight: 400,
                color: TEXT_PRIMARY,
                lineHeight: 1.2,
              }}
            >
              Metis
            </h1>
            <p style={{ fontSize: "11px", color: TEXT_FAINT, marginTop: "2px" }}>
              Your AI salon copilot
            </p>
          </div>
        </div>

        {/* Chat component */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <MentisChat
            fullPage
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
            onMessageSent={fetchConversations}
          />
        </div>
      </div>
    </div>
  );
}
