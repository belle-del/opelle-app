"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { MessageThread } from "@/lib/types";

type ThreadWithClient = MessageThread & { clientName: string };

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ThreadList({ threads }: { threads: ThreadWithClient[] }) {
  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const hasUnread = thread.unreadStylist > 0;
        return (
          <Link key={thread.id} href={`/app/messages/${thread.id}`}>
            <Card className="cursor-pointer" style={{ marginBottom: "8px" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="flex items-center justify-center font-medium flex-shrink-0"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: hasUnread
                          ? "rgba(196,171,112,0.15)"
                          : "var(--garnet-deep)",
                        color: hasUnread
                          ? "var(--brass)"
                          : "var(--garnet-blush)",
                        fontSize: "12px",
                      }}
                    >
                      {thread.clientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: hasUnread ? 600 : 500,
                          color: "var(--text-on-stone)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {thread.clientName}
                      </p>
                      <p
                        style={{
                          fontSize: "9px",
                          color: "var(--text-on-stone-faint)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {thread.subject || "Conversation"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {hasUnread && (
                      <Badge variant="warning">
                        {thread.unreadStylist}
                      </Badge>
                    )}
                    <span
                      style={{
                        fontSize: "9px",
                        color: hasUnread
                          ? "var(--brass)"
                          : "var(--text-on-stone-faint)",
                      }}
                    >
                      {relativeTime(thread.lastMessageAt)}
                    </span>
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: "var(--text-on-stone-ghost)" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
