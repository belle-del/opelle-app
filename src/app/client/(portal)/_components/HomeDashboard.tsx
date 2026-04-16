"use client";

import { useState } from "react";
import Link from "next/link";
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
  pendingAppointments?: AppointmentRow[];
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

const categoryColors: Record<string, { bg: string; text: string }> = {
  tip: { bg: "var(--brass)", text: "var(--text-on-stone)" },
  product_spotlight: { bg: "var(--garnet-blush)", text: "#FFF" },
  seasonal: { bg: "#6A8E66", text: "#FFF" },
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
  pendingAppointments = [],
}: Props) {
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function respondToAppointment(id: string, action: "confirm" | "decline") {
    setRespondingId(id);
    try {
      await fetch("/api/client/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, action }),
      });
      setDismissed((prev) => new Set(prev).add(id));
    } catch {
      // silently fail
    } finally {
      setRespondingId(null);
    }
  }

  const visiblePending = pendingAppointments.filter((a) => !dismissed.has(a.id));

  return (
    <div className="space-y-6">
      {/* Pending appointment confirmations */}
      {visiblePending.length > 0 && (
        <div className="space-y-3">
          {visiblePending.map((appt) => (
            <div
              key={appt.id}
              style={{
                padding: "16px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--brass) 0%, var(--brass-warm) 100%)",
                color: "var(--text-on-stone)",
              }}
            >
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "6px" }}>
                Confirm Your Appointment
              </p>
              <p style={{ fontSize: "16px", fontFamily: "'Fraunces', serif", fontWeight: 400, marginBottom: "2px" }}>
                {appt.service_name}
              </p>
              <p style={{ fontSize: "13px", marginBottom: "12px" }}>
                {formatDate(appt.start_at)} ({appt.duration_mins} min)
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => respondToAppointment(appt.id, "confirm")}
                  disabled={respondingId === appt.id}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "var(--text-on-stone)",
                    color: "var(--stone-lightest)",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {respondingId === appt.id ? "..." : "Confirm"}
                </button>
                <button
                  onClick={() => respondToAppointment(appt.id, "decline")}
                  disabled={respondingId === appt.id}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "transparent",
                    color: "var(--text-on-stone)",
                    border: "1px solid rgba(44,44,36,0.3)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "28px",
            color: "var(--text-on-stone)",
            marginBottom: "2px",
            letterSpacing: "-0.02em",
          }}
        >
          Hi, {clientFirstName}
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
          Here&apos;s what&apos;s happening
        </p>
      </div>

      {/* Next Appointment */}
      {nextAppointment ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              style={{
                background: "var(--garnet-blush)",
                color: "#FFF",
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "20px",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              Upcoming
            </span>
          </div>
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "20px",
              color: "var(--text-on-stone)",
              marginBottom: "6px",
            }}
          >
            {nextAppointment.service_name}
          </h3>
          <p style={{ fontSize: "15px", color: "var(--text-on-stone-faint)", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>
            {formatDate(nextAppointment.start_at)}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            with {stylistName}
          </p>
        </div>
      ) : (
        <Link href="/client/book" style={{ textDecoration: "none", display: "block" }}>
          <div
            style={{
              background: "linear-gradient(135deg, var(--text-on-stone) 0%, var(--olive-mid) 100%)",
              borderRadius: "16px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "20px",
                color: "var(--stone-lightest)",
                marginBottom: "6px",
              }}
            >
              Ready for your next visit?
            </p>
            <span style={{ fontSize: "14px", color: "var(--brass)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              Book an appointment →
            </span>
          </div>
        </Link>
      )}

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {unreadNotifications.map((n) => (
            <Link
              key={n.id}
              href={n.action_url || "/client/messages"}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <div
                className="flex items-center gap-2 whitespace-nowrap"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--stone-light)",
                  borderRadius: "24px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  color: "var(--olive-mid)",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <NotificationIcon type={n.type} />
                {n.title.length > 35 ? n.title.slice(0, 35) + "..." : n.title}
                <span style={{ color: "var(--brass)", fontWeight: 600 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction href="/client/book" label="Book Again" icon="calendar" />
        <QuickAction href="/client/inspo" label="Upload Inspo" icon="sparkles" />
        <QuickAction href="/client/aftercare" label="Aftercare" icon="leaf" />
      </div>

      {/* Last Visit */}
      {lastVisit && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>
            Last visit
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: "16px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {lastVisit.service_name}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                {formatShortDate(lastVisit.start_at)}
              </p>
            </div>
            {hasSharedFormula && (
              <div className="flex items-center gap-1.5" style={{ background: "var(--brass-glow)", padding: "5px 10px", borderRadius: "20px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: "12px", color: "var(--brass)", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Formula on file</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* From Your Stylist */}
      {recentContent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "20px",
                color: "var(--text-on-stone)",
              }}
            >
              From Your Stylist
            </h2>
            <Link
              href="/client/content"
              style={{ fontSize: "14px", color: "var(--brass)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
            >
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {recentContent.map((post) => {
              const colors = categoryColors[post.category] || categoryColors.tip;
              return (
                <Link key={post.id} href={`/client/content/${post.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "16px",
                      padding: "16px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {categoryLabel(post.category)}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                        {post.publishedAt ? formatShortDate(post.publishedAt) : ""}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: "16px",
                        color: "var(--text-on-stone)",
                        marginBottom: "4px",
                      }}
                    >
                      {post.title}
                    </h3>
                    <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5", fontFamily: "'DM Sans', sans-serif" }}>
                      {post.body.length > 100 ? post.body.slice(0, 100) + "..." : post.body}
                    </p>
                  </div>
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
      <div
        className="text-center"
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "20px 8px 16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="mx-auto mb-3 flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "rgba(196,171,112,0.12)",
          }}
        >
          <QuickActionIcon icon={icon} />
        </div>
        <p style={{ fontSize: "13px", color: "#3D3D35", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          {label}
        </p>
      </div>
    </Link>
  );
}

function QuickActionIcon({ icon }: { icon: string }) {
  const color = "#C4AB70";
  const size = 22;

  switch (icon) {
    case "calendar":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" /><path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "sparkles":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case "leaf":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    default:
      return null;
  }
}

function NotificationIcon({ type }: { type: string }) {
  const color = "#5C5A4F";
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
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
  }
}
