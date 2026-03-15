"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Message } from "@/lib/types";

type Props = {
  messages: Message[];
  threadId: string;
  stylistName: string;
};

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClientThreadView({ messages: initialMessages, threadId, stylistName }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    // Optimistic UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      workspaceId: "",
      threadId,
      senderType: "client",
      senderId: "",
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setBody("");
    setSending(true);

    try {
      const res = await fetch("/api/client/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? data.message : m))
        );
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 80px)",
        maxHeight: "calc(100dvh - 80px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--stone-shadow, rgba(255,255,255,0.08))",
          flexShrink: 0,
        }}
      >
        <Link
          href="/client/messages"
          style={{
            color: "var(--brass)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--stone-lightest)",
              fontFamily: "'Fraunces', serif",
            }}
          >
            {stylistName}
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-on-stone-ghost)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Your Stylist
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 0",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: "var(--text-on-stone-faint)",
              fontSize: "13px",
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            No messages yet. Send a message to start the conversation.
          </div>
        )}

        {messages.map((msg) => {
          const isClient = msg.senderType === "client";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isClient ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: isClient
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                  background: isClient
                    ? "var(--garnet, #6b2b3a)"
                    : "var(--stone-card)",
                  color: isClient
                    ? "var(--stone-lightest)"
                    : "var(--text-on-stone)",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.45",
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.body}
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    color: isClient
                      ? "rgba(255,255,255,0.5)"
                      : "var(--text-on-stone-ghost)",
                    marginTop: "4px",
                    textAlign: "right" as const,
                  }}
                >
                  {formatRelativeDate(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply input */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "flex-end",
          paddingTop: "12px",
          borderTop: "1px solid var(--stone-shadow, rgba(255,255,255,0.08))",
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1,
            background: "var(--stone-card)",
            border: "1px solid var(--stone-shadow, rgba(255,255,255,0.12))",
            borderRadius: "20px",
            padding: "10px 16px",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            color: "var(--text-on-stone)",
            resize: "none",
            outline: "none",
            maxHeight: "100px",
            lineHeight: "1.4",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          style={{
            background: body.trim() && !sending ? "var(--brass)" : "var(--stone-card)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: body.trim() && !sending ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={body.trim() && !sending ? "var(--bark-deepest)" : "var(--text-on-stone-ghost)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
