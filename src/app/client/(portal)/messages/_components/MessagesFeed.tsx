"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
};

type Props = {
  notifications: NotificationRow[];
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function typeIcon(type: string) {
  const color = "var(--text-on-stone-dim)";
  const size = 16;

  switch (type) {
    case "booking_update":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" /><path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "inspo_update":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case "aftercare":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "stylist_message":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case "order_update":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
  }
}

export function MessagesFeed({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
        <CardContent className="py-8 text-center">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif" }}>
            No messages yet
          </p>
          <p style={{ color: "var(--text-on-stone-ghost)", fontSize: "12px", marginTop: "4px" }}>
            You&apos;ll see updates from your stylist here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const isUnread = !n.read_at;
        const content = (
          <Card
            key={n.id}
            style={{
              borderLeft: isUnread ? "3px solid var(--brass)" : undefined,
              background: isUnread ? "var(--stone-lightest)" : "var(--stone-card)",
            }}
          >
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-on-stone)",
                      fontWeight: isUnread ? 500 : 400,
                    }}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ fontSize: "10px", color: "var(--text-on-stone-ghost)", marginTop: "4px" }}>
                    {formatRelativeDate(n.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

        if (n.action_url) {
          return (
            <Link key={n.id} href={n.action_url} style={{ textDecoration: "none" }}>
              {content}
            </Link>
          );
        }

        return <div key={n.id}>{content}</div>;
      })}
    </div>
  );
}
