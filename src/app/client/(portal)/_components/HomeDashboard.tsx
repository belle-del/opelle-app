"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentPost } from "@/lib/types";

type AppointmentRow = {
  id: string;
  service_name: string;
  start_at: string;
  duration_mins: number;
  status: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  action_url: string | null;
  created_at: string;
};

type Props = {
  clientFirstName: string;
  stylistName: string;
  nextAppointment: AppointmentRow | null;
  lastVisit: AppointmentRow | null;
  unreadNotifications: NotificationRow[];
  hasSharedFormula: boolean;
  recentContent: ContentPost[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

const categoryBadgeStyles: Record<string, { background: string; color: string }> = {
  tip: { background: "var(--brass)", color: "var(--bark-deepest)" },
  product_spotlight: { background: "var(--garnet)", color: "var(--stone-lightest)" },
  seasonal: { background: "rgba(106,142,102,0.3)", color: "rgb(166,202,162)" },
};

function categoryLabel(cat: string): string {
  switch (cat) {
    case "tip": return "Tip";
    case "product_spotlight": return "Product Spotlight";
    case "seasonal": return "Seasonal";
    default: return cat;
  }
}

export function HomeDashboard({
  clientFirstName,
  stylistName,
  nextAppointment,
  lastVisit,
  unreadNotifications,
  hasSharedFormula,
  recentContent,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1
          className="text-2xl mb-0.5"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
        >
          Hi, {clientFirstName}
        </h1>
        <p style={{ fontSize: "13px", color: "var(--stone-shadow)" }}>
          Here&apos;s what&apos;s happening
        </p>
      </div>

      {/* Next Appointment Card */}
      {nextAppointment ? (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start justify-between mb-2">
              <Badge variant="default" style={{ background: "var(--garnet)", color: "var(--stone-lightest)", fontSize: "10px" }}>
                Upcoming
              </Badge>
            </div>
            <h3
              className="text-lg mb-1"
              style={{ fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)" }}
            >
              {nextAppointment.service_name}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-on-stone-dim)", marginBottom: "4px" }}>
              {formatDate(nextAppointment.start_at)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>
              with {stylistName}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Link href="/client/book" style={{ textDecoration: "none" }}>
          <Card style={{ border: "1px dashed var(--brass-soft)" }}>
            <CardContent className="py-6 text-center">
              <p
                className="text-lg mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
              >
                Ready for your next visit?
              </p>
              <p style={{ fontSize: "13px", color: "var(--brass)" }}>
                Book an appointment
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Action Items Strip */}
      {unreadNotifications.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {unreadNotifications.map((n) => (
            <Link
              key={n.id}
              href={n.action_url || "/client/messages"}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <div
                className="px-3 py-2 rounded-full whitespace-nowrap flex items-center gap-1.5"
                style={{
                  background: "var(--brass-soft)",
                  fontSize: "12px",
                  color: "var(--text-on-stone)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <NotificationIcon type={n.type} />
                {n.title.length > 35 ? n.title.slice(0, 35) + "..." : n.title}
                <span style={{ color: "var(--brass)" }}>&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction href="/client/book" label="Book Again" icon="calendar" />
        <QuickAction href="/client/inspo" label="Upload Inspo" icon="sparkles" />
        <QuickAction href="/client/aftercare" label="Aftercare" icon="leaf" />
      </div>

      {/* Last Visit Summary */}
      {lastVisit && (
        <Card>
          <CardContent className="py-3">
            <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Last visit
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif" }}>
                  {lastVisit.service_name}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>
                  {formatShortDate(lastVisit.start_at)}
                </p>
              </div>
              {hasSharedFormula && (
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: "12px", color: "var(--brass)" }}>Formula on file</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* From Your Stylist — Content Feed */}
      {recentContent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg"
              style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
            >
              From Your Stylist
            </h2>
            <Link
              href="/client/content"
              style={{ fontSize: "13px", color: "var(--brass)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}
            >
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {recentContent.map((post) => {
              const badgeStyle = categoryBadgeStyles[post.category] || categoryBadgeStyles.tip;
              return (
                <Link key={post.id} href={`/client/content/${post.id}`} style={{ textDecoration: "none" }}>
                  <Card style={{ background: "var(--stone-card)" }}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <Badge
                          variant="default"
                          style={{ ...badgeStyle, fontSize: "10px" }}
                        >
                          {categoryLabel(post.category)}
                        </Badge>
                        <span style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                          {post.publishedAt ? formatShortDate(post.publishedAt) : ""}
                        </span>
                      </div>
                      <h3
                        className="text-sm mb-1"
                        style={{ fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)" }}
                      >
                        {post.title}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", lineHeight: "1.4" }}>
                        {post.body.length > 80 ? post.body.slice(0, 80) + "..." : post.body}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Card className="text-center" style={{ background: "var(--stone-card)" }}>
        <CardContent className="py-4 px-2">
          <div className="mx-auto mb-2 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--brass-soft)" }}>
            <QuickActionIcon icon={icon} />
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickActionIcon({ icon }: { icon: string }) {
  const color = "var(--brass)";
  const size = 18;

  switch (icon) {
    case "calendar":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" /><path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "sparkles":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case "leaf":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    default:
      return null;
  }
}

function NotificationIcon({ type }: { type: string }) {
  const color = "var(--text-on-stone-dim)";
  const size = 14;

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
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
  }
}
