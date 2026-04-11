"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { DevContext } from "@/lib/dev-context";
import type { ViewMode } from "@/lib/dev-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  FlaskConical,
  Package,
  CheckSquare,
  Settings,
  LogOut,
  History,
  MessageCircle,
  FileText,
  Sparkles,
  Menu,
  X,
  Monitor,
  Timer,
  GraduationCap,
  ShoppingCart,
  Images,
  UsersRound,
  Megaphone,
  BarChart3,
  Globe,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { Permission } from "@/lib/permissions";

// Which modes can see each nav item. 'god' always sees everything.
const NAV_VISIBILITY: Record<string, ViewMode[]> = {
  "/app":              ["god", "school", "salon", "practitioner"],
  "/app/floor":        ["god", "school"],
  "/app/hours":        ["god", "school"],
  "/app/progress":     ["god", "school"],
  "/app/checkout":     ["god", "school"],
  "/app/appointments": ["god", "school", "salon", "practitioner"],
  "/app/availability": ["god", "school", "salon", "practitioner"],
  "/app/clients":      ["god", "school", "salon", "practitioner"],
  "/app/team":         ["god", "school", "salon"],
  "/app/formulas":     ["god", "school", "practitioner"],
  "/app/portfolio":    ["god", "school", "practitioner"],
  "/app/network":      ["god", "school", "salon", "practitioner"],
  "/app/products":     ["god", "school", "salon", "practitioner"],
  "/app/messages":     ["god", "school", "salon", "practitioner"],
  "/app/marketing":    ["god", "school", "salon", "practitioner"],
  "/app/reports":      ["god", "school", "salon"],
  "/app/content":      ["god", "salon", "practitioner"],
  "/app/metis":        ["god", "school", "salon", "practitioner"],
  "/app/tasks":        ["god", "school", "salon", "practitioner"],
  "/app/history":      ["god", "school"],
  "/app/settings":     ["god", "school", "salon", "practitioner"],
};

// Which permission is needed to see each nav item. Items not listed are always visible.
// Uses the least-restrictive permission so the item shows if user has ANY level of access.
const NAV_PERMISSIONS: Partial<Record<string, Permission>> = {
  "/app/floor":        "floor.view",
  "/app/hours":        "hours.view_own",
  "/app/progress":     "progress.view_own",
  "/app/checkout":     "checkout.use",
  "/app/appointments": "appointments.view_own",
  "/app/availability": "availability.view_own",
  "/app/clients":      "clients.view_own",
  "/app/formulas":     "formulas.view_own",
  "/app/portfolio":    "portfolio.view_own",
  "/app/products":     "products.view",
  "/app/messages":     "messages.use",
  "/app/marketing":    "marketing.view",
  "/app/reports":      "reports.view",
  "/app/metis":        "metis.use",
  "/app/history":      "history.view_own",
  "/app/team":         "team.view",
  "/app/settings":     "settings.manage",
};

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/floor", label: "Floor View", icon: Monitor },
      { href: "/app/hours", label: "Hours", icon: Timer },
      { href: "/app/progress", label: "Progress", icon: GraduationCap },
      { href: "/app/checkout", label: "Checkout", icon: ShoppingCart },
      { href: "/app/appointments", label: "Appointments", icon: Calendar },
      { href: "/app/availability", label: "Availability", icon: CalendarCheck },
      { href: "/app/clients", label: "Clients", icon: Users },
      { href: "/app/team", label: "Team", icon: UsersRound },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/app/formulas", label: "Formulas", icon: FlaskConical },
      { href: "/app/portfolio", label: "Portfolio", icon: Images },
      { href: "/app/network", label: "Network", icon: Globe },
      { href: "/app/products", label: "Products", icon: Package },
      { href: "/app/messages", label: "Messages", icon: MessageCircle },
      { href: "/app/marketing", label: "Marketing", icon: Megaphone },
      { href: "/app/content", label: "Content", icon: FileText },
      { href: "/app/metis", label: "Metis", icon: Sparkles },
      { href: "/app/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/app/reports", label: "Reports", icon: BarChart3 },
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/threads");
      if (!res.ok) return;
      const data = await res.json();
      const threads = data.threads || [];
      const total = threads.reduce(
        (sum: number, t: { unreadStylist?: number }) => sum + (t.unreadStylist || 0),
        0
      );
      setUnreadCount(total);
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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

  const devCtx = useContext(DevContext);
  const viewMode: ViewMode = devCtx?.viewMode ?? "god";
  const { role, can, loading: permsLoading } = usePermissions();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initial = (user.user_metadata?.full_name?.[0] || user.email?.[0] || "?").toUpperCase();
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Practitioner";

  // Tree background layered directly on the aside via CSS backgrounds:
  // Layer 1 (top): gradient overlay that fades from solid bg to semi-transparent
  // Layer 2: the tree image
  // Layer 3 (bottom): solid fallback color
  const treeBackgroundStyle = {
    backgroundColor: "#1f231a",
    backgroundImage: `
      linear-gradient(to bottom, #1f231a 0%, #1f231a 25%, rgba(31,35,26,0.55) 40%, rgba(31,35,26,0.55) 100%),
      url(/textures/olive-tree-cropped.png)
    `,
    backgroundSize: "100% 100%, 110% auto",
    backgroundPosition: "top left, bottom center",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundOrigin: "border-box, border-box" as string,
    backgroundClip: "border-box, border-box" as string,
  } as React.CSSProperties;

  const sidebarContent = (
    <div className="flex flex-col flex-1 relative min-h-0">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 relative z-10" style={{ borderBottom: "1px solid rgba(196,171,112,0.08)" }}>
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
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 relative z-10 min-h-0">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(196,171,112,0.7)",
                marginBottom: "6px",
                paddingLeft: "8px",
              }}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items
                .filter((item) => {
                  const allowed = NAV_VISIBILITY[item.href];
                  if (allowed && viewMode !== "god" && !allowed.includes(viewMode)) return false;
                  const requiredPerm = NAV_PERMISSIONS[item.href];
                  if (requiredPerm && !permsLoading && !can(requiredPerm)) return false;
                  return true;
                })
                .map((item) => {
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
                      color: isActive ? "#F1EFE0" : "rgba(241,239,224,0.7)",
                      background: isActive ? "rgba(196,171,112,0.08)" : "transparent",
                      borderLeft: isActive ? "2px solid #8FADC8" : "2px solid transparent",
                    }}
                  >
                    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                      <Icon
                        style={{
                          width: "16px",
                          height: "16px",
                          opacity: isActive ? 0.9 : 0.7,
                          flexShrink: 0,
                        }}
                      />
                      {item.label === "Messages" && unreadCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-8px",
                            background: "#C4AB70",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 600,
                            minWidth: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            padding: "0 3px",
                          }}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {/* Log Formula CTA — scrolls with nav */}
        <div className="px-0 pt-4 pb-1">
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
      </nav>

      {/* User profile — pinned at bottom, never scrolls */}
      <div className="mx-2 mb-2 px-2 py-3 rounded-lg relative z-10 flex-shrink-0" style={{ borderTop: "1px solid rgba(196,171,112,0.08)" }}>
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
            <p className="truncate" style={{ fontSize: "9px", color: "rgba(241,239,224,0.4)", textTransform: "capitalize" }}>
              {permsLoading ? "..." : role.replace("_", " ")}
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
          ...treeBackgroundStyle,
          overflow: "hidden",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: mobileOpen
            ? "inset -1px 0 0 rgba(196,171,112,0.08), 8px 0 32px rgba(0,0,0,0.3)"
            : "inset -1px 0 0 rgba(196,171,112,0.08)",
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
          ...treeBackgroundStyle,
          boxShadow: "inset -1px 0 0 rgba(196,171,112,0.08)",
          overflow: "hidden",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
