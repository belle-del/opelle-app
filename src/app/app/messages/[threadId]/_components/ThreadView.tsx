"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import type { MessageThread, Message } from "@/lib/types";

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ThreadViewProps {
  thread: MessageThread;
  messages: Message[];
  clientName: string;
  clientId: string;
}

export function ThreadView({
  thread,
  messages: initialMessages,
  clientName,
  clientId,
}: ThreadViewProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on load and when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Pause polling when tab is hidden or a message is being sent
      if (document.hidden || sending) return;

      try {
        const res = await fetch(`/api/messages/threads/${thread.id}`);
        if (res.ok) {
          const data = await res.json();
          const fetched: Message[] = data.messages ?? data;
          setMessages((prev) =>
            fetched.length !== prev.length ? fetched : prev
          );
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [thread.id, sending]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    // Optimistic UI
    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      workspaceId: thread.workspaceId,
      threadId: thread.id,
      senderType: "stylist",
      senderId: "",
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setBody("");
    setSending(true);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, body: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? data.message : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 pb-4 mb-4"
        style={{ borderBottom: "1px solid var(--brass-line)" }}
      >
        <Link href="/app/messages">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "18px",
              color: "var(--text-on-bark)",
              fontWeight: 400,
            }}
          >
            {clientName}
          </h2>
          {thread.subject && (
            <p
              style={{
                fontSize: "10px",
                color: "var(--text-on-bark-faint)",
              }}
            >
              {thread.subject}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-3 px-1 pb-4"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-on-bark-faint)",
              }}
            >
              No messages yet. Start the conversation below.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isStylist = msg.senderType === "stylist";
          return (
            <div
              key={msg.id}
              className="flex"
              style={{
                justifyContent: isStylist ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: isStylist
                    ? "12px 12px 4px 12px"
                    : "12px 12px 12px 4px",
                  background: isStylist
                    ? "var(--garnet)"
                    : "var(--stone-card)",
                  color: isStylist
                    ? "var(--stone-lightest)"
                    : "var(--text-on-stone)",
                  border: isStylist
                    ? "1px solid var(--garnet-vivid)"
                    : "1px solid var(--brass-line)",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.body}
                </p>
                <p
                  style={{
                    fontSize: "8px",
                    marginTop: "6px",
                    opacity: 0.6,
                    textAlign: isStylist ? "right" : "left",
                  }}
                >
                  {relativeTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply Input */}
      <div
        className="flex items-end gap-2 pt-4"
        style={{ borderTop: "1px solid var(--brass-line)" }}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={2}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--brass-line)",
            background: "var(--stone-card)",
            color: "var(--text-on-stone)",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            resize: "none",
            outline: "none",
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          size="md"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
