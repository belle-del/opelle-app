"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type Props = {
  clientFirstName: string;
  stylistName: string;
  children: React.ReactNode;
};

const navTabs = [
  { label: "Home", href: "/client", icon: "home" },
  { label: "Book", href: "/client/book", icon: "calendar" },
  { label: "Inspo", href: "/client/inspo", icon: "sparkles" },
  { label: "Aftercare", href: "/client/aftercare", icon: "leaf" },
  { label: "More", href: "#more", icon: "grid" },
] as const;

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "var(--brass)" : "var(--stone-shadow)";
  const size = 22;

  switch (icon) {
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
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
    case "grid":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      );
    default:
      return null;
  }
}

export function ClientPortalShell({ clientFirstName, stylistName, children }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/client") return pathname === "/client";
    return pathname.startsWith(href);
  };

  const moreItems = [
    { label: "History", href: "/client/history", icon: "clock" },
    { label: "Products", href: "/client/products", icon: "package" },
    { label: "Profile", href: "/client/profile", icon: "user" },
    { label: "Messages", href: "/client/messages", icon: "message" },
    { label: "From Your Stylist", href: "/client/content", icon: "pen" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bark-deepest)", maxWidth: "100vw", overflow: "hidden" }}
    >
      {/* Fixed Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: "56px",
          background: "var(--bark-deepest)",
          borderBottom: "1px solid rgba(196,171,112,0.12)",
        }}
      >
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--stone-lightest)" }}>
          Opelle
        </span>
        <div className="text-right">
          <span style={{ fontSize: "13px", color: "var(--stone-lightest)", fontFamily: "'DM Sans', sans-serif" }}>
            {clientFirstName}
          </span>
          <span style={{ fontSize: "11px", color: "var(--stone-shadow)", display: "block", fontFamily: "'DM Sans', sans-serif" }}>
            with {stylistName}
          </span>
        </div>
      </header>

      {/* Scrollable content */}
      <main
        className="flex-1 mx-auto w-full"
        style={{ paddingTop: "56px", paddingBottom: "64px", maxWidth: "430px" }}
      >
        <div className="px-4 py-4">
          {children}
        </div>
      </main>

      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className="fixed left-0 right-0 z-50 transition-transform duration-300"
        style={{
          bottom: "64px",
          transform: moreOpen ? "translateY(0)" : "translateY(100%)",
          background: "var(--stone-card)",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          maxWidth: "430px",
          margin: "0 auto",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <div className="px-4 py-3">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--stone-shadow)" }} />
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 py-3 px-2 rounded-lg transition-colors"
              style={{
                textDecoration: "none",
                color: pathname.startsWith(item.href) ? "var(--brass)" : "var(--text-on-stone)",
                fontSize: "15px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <MoreIcon icon={item.icon} active={pathname.startsWith(item.href)} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMoreOpen(false);
              // Sign out will be handled via a form post or direct navigation
              window.location.href = "/client/login?signout=true";
            }}
            className="flex items-center gap-3 py-3 px-2 rounded-lg w-full text-left mt-2"
            style={{
              background: "none",
              border: "none",
              color: "var(--garnet)",
              fontSize: "15px",
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--garnet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Fixed Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: "64px",
          background: "var(--bark-deepest)",
          borderTop: "1px solid rgba(196,171,112,0.12)",
        }}
      >
        {navTabs.map((tab) => {
          const active = tab.href === "#more" ? moreOpen : isActive(tab.href);

          if (tab.href === "#more") {
            return (
              <button
                key={tab.label}
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <NavIcon icon={tab.icon} active={active} />
                <span
                  style={{
                    fontSize: "10px",
                    color: active ? "var(--brass)" : "var(--stone-shadow)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              onClick={() => setMoreOpen(false)}
              className="flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center"
              style={{ textDecoration: "none" }}
            >
              <NavIcon icon={tab.icon} active={active} />
              <span
                style={{
                  fontSize: "10px",
                  color: active ? "var(--brass)" : "var(--stone-shadow)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MoreIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "var(--brass)" : "var(--text-on-stone-faint)";
  const size = 20;

  switch (icon) {
    case "clock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "package":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
        </svg>
      );
    case "user":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "message":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case "pen":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        </svg>
      );
    default:
      return null;
  }
}
