"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FlaskConical,
  Package,
  CheckSquare,
  Settings,
  LogOut,
  History,
  Menu,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/appointments", label: "Appointments", icon: Calendar },
      { href: "/app/clients", label: "Clients", icon: Users },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/app/formulas", label: "Formulas", icon: FlaskConical },
      { href: "/app/products", label: "Products", icon: Package },
      { href: "/app/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/app/history", label: "History", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface AppNavProps {
  user: User;
  workspaceName?: string;
}


export function AppNav({ user, workspaceName }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initial = (user.user_metadata?.full_name?.[0] || user.email?.[0] || "?").toUpperCase();
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Practitioner";

  const sidebarContent = (
    <div className="flex flex-col flex-1">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(196,171,112,0.08)" }}>
        <Link href="/app" className="block">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "15px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#F1EFE0",
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            OPELLE
          </h1>
          <span
            style={{
              display: "block",
              fontSize: "7px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#C4AB70",
              marginTop: "2px",
            }}
          >
            Practitioner Suite
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              style={{
                fontSize: "8px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(241,239,224,0.35)",
                marginBottom: "6px",
                paddingLeft: "8px",
              }}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/app" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("flex items-center gap-2.5 px-2 py-2 rounded transition-all duration-150")}
                    style={{
                      fontSize: "11px",
                      color: isActive ? "#F1EFE0" : "rgba(241,239,224,0.55)",
                      background: isActive ? "rgba(143,173,200,0.08)" : "transparent",
                      borderLeft: isActive ? "2px solid #8FADC8" : "2px solid transparent",
                    }}
                  >
                    <Icon
                      style={{
                        width: "16px",
                        height: "16px",
                        opacity: isActive ? 0.85 : 0.55,
                        flexShrink: 0,
                      }}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Log Formula CTA */}
      <div className="px-3 pb-3">
        <Link href="/app/formulas/log">
          <button
            className="w-full flex items-center justify-center gap-1.5"
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              background: "#440606",
              border: "1px solid #5C0B0B",
              color: "#F1EFE0",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <FlaskConical style={{ width: "14px", height: "14px" }} />
            Log Formula
          </button>
        </Link>
      </div>

      {/* User profile */}
      <div className="mx-2 mb-2 px-2 py-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(143,173,200,0.12)",
              color: "#8FADC8",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: "11px", color: "rgba(241,239,224,0.7)" }}>
              {displayName}
            </p>
            <p className="truncate" style={{ fontSize: "9px", color: "rgba(241,239,224,0.4)" }}>
              Practitioner
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded transition-all duration-150"
          style={{ fontSize: "10px", color: "rgba(241,239,224,0.4)" }}
        >
          <LogOut style={{ width: "14px", height: "14px" }} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{
          height: "52px",
          background: "#1f231a",
          borderBottom: "1px solid rgba(196,171,112,0.08)",
        }}
      >
        <Link href="/app" className="flex items-center gap-2">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "14px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#F1EFE0",
              fontWeight: 400,
            }}
          >
            OPELLE
          </h1>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: mobileOpen ? "rgba(143,173,200,0.12)" : "transparent",
            border: "none",
            color: "#F1EFE0",
            transition: "background 0.15s",
          }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile overlay backdrop ──────────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile sidebar (slides in) ───────────────────────────── */}
      <aside
        className="md:hidden fixed left-0 top-0 h-full flex flex-col z-50"
        style={{
          width: "220px",
          background: "#1f231a",
          borderRight: "1px solid rgba(196,171,112,0.08)",
          overflow: "hidden",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: mobileOpen ? "8px 0 32px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Close button inside sidebar */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              background: "rgba(241,239,224,0.06)",
              border: "none",
              color: "rgba(241,239,224,0.5)",
              transition: "background 0.15s",
            }}
            aria-label="Close menu"
          >
            <X size={14} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Desktop sidebar (always visible) ─────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full flex-col"
        style={{
          width: "170px",
          background: "#1f231a",
          borderRight: "1px solid rgba(196,171,112,0.08)",
          overflow: "hidden",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
