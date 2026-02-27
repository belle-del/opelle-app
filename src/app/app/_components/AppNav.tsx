"use client";

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
  Clock,
  History,
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

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initial = (user.user_metadata?.full_name?.[0] || user.email?.[0] || "?").toUpperCase();
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Practitioner";

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col"
      style={{
        width: "170px",
        background: "#1A1E14",
        borderRight: "1px solid rgba(181,154,91,0.08)",
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(181,154,91,0.08)" }}>
        <Link href="/app">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "15px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#D8D0C1",
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
              color: "#9E8750",
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
                fontSize: "7px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(237,232,222,0.35)",
                marginBottom: "4px",
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
                    className={cn("flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-150")}
                    style={{
                      fontSize: "10px",
                      color: isActive ? "#D8D0C1" : "rgba(237,232,222,0.55)",
                      background: isActive ? "rgba(181,154,91,0.07)" : "transparent",
                      borderLeft: isActive ? "2px solid #B59A5B" : "2px solid transparent",
                    }}
                  >
                    <Icon
                      style={{
                        width: "12px",
                        height: "12px",
                        opacity: isActive ? 0.8 : 0.5,
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
              background: "#6E2830",
              border: "1px solid #8B353E",
              color: "#E0D9CC",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <FlaskConical style={{ width: "11px", height: "11px" }} />
            Log Formula
          </button>
        </Link>
      </div>

      {/* User profile */}
      <div
        className="px-3 py-3"
        style={{ borderTop: "1px solid rgba(181,154,91,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#3A1219",
              color: "#C4868F",
              fontSize: "10px",
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: "10px", color: "rgba(237,232,222,0.7)" }}>
              {displayName}
            </p>
            <p className="truncate" style={{ fontSize: "8px", color: "rgba(237,232,222,0.4)" }}>
              Practitioner
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded transition-all duration-150"
          style={{ fontSize: "9px", color: "rgba(237,232,222,0.4)" }}
        >
          <LogOut style={{ width: "11px", height: "11px" }} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
