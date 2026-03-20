"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, MessageSquare } from "lucide-react";
import type { MessageThread, Message } from "@/lib/types";

type ThreadWithMessages = {
  thread: MessageThread;
  messages: Message[];
};

type Props = {
  threads: ThreadWithMessages[];
  clientId: string;
};

export function ClientMessagesTab({ threads, clientId }: Props) {
  const [localThreads, setLocalThreads] = useState(threads);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick the most recent thread for display
  const activeThread = localThreads[0] ?? null;
  const messages = activeThread?.messages ?? [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, body: trimmed }),
      });

      if (!res.ok) throw new Error("Send failed");

      const data = await res.json();
      setBody("");

      // Optimistically add the message to the local state
      if (activeThread) {
        setLocalThreads((prev) => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            messages: [...updated[0].messages, data.message],
          };
          return updated;
        });
      } else {
        // New thread was created
        setLocalThreads([
          {
            thread: data.thread,
            messages: [data.message],
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-4">
      {/* Message history */}
      {messages.length > 0 ? (
        <div
          ref={scrollRef}
          className="space-y-3 max-h-[400px] overflow-y-auto pr-1"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === "stylist" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.senderType === "stylist"
                    ? "text-foreground rounded-br-md"
                    : "bg-white/10 text-foreground rounded-bl-md"
                }`}
                style={msg.senderType === "stylist" ? { backgroundColor: "rgba(74,26,46,0.12)" } : undefined}
              >
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.senderType === "stylist"
                      ? "text-right opacity-60"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No messages with this client yet. Start a conversation below.
          </p>
        </div>
      )}

      {/* View all conversations link */}
      {localThreads.length > 1 && (
        <div className="text-center">
          <Link
            href="/app/messages"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            View all {localThreads.length} conversations
          </Link>
        </div>
      )}

      {/* Compose */}
      <div className="flex items-end gap-2 pt-2 border-t border-white/10">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:border-[var(--stone-warm)]"
          style={{ "--tw-ring-color": "rgba(74,26,46,0.3)" } as React.CSSProperties}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="rounded-xl disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors flex items-center gap-2"
          style={{ backgroundColor: "var(--garnet)", }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--brass-warm)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--garnet)"; }}
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
