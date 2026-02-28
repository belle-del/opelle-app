# Opelle v7 Reskin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reskin all Opelle frontend components from the current dark/emerald glass theme to the v7 warm olive-bark/stone/garnet/brass palette with Fraunces + Cormorant Garamond typography, a draggable widget dashboard, and a full Day/Week/Month calendar — with zero changes to API routes or database logic.

**Architecture:** CSS-first approach (Option A). Replace CSS custom properties in `globals.css`, update Tailwind config, then restyle each component file in-place using Tailwind utility classes mapping to the new palette. The widget system uses the already-installed `react-dnd`. The calendar replaces `react-big-calendar` with a bespoke Day/Week/Month component. The custom cursor is implemented as a dedicated `"use client"` component (not dangerouslySetInnerHTML) to avoid XSS risk.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, react-dnd, lucide-react, Google Fonts (Fraunces + Cormorant Garamond + DM Sans)

---

## Key File Paths

- Global CSS: `src/app/globals.css`
- Root layout: `src/app/layout.tsx`
- App layout: `src/app/app/layout.tsx`
- Sidebar nav: `src/app/app/_components/AppNav.tsx`
- Dashboard: `src/app/app/page.tsx`
- Dashboard widget system: `src/app/app/_components/WidgetDashboard.tsx` (new)
- Appointments: `src/app/app/appointments/page.tsx`
- Appointments calendar: `src/app/app/appointments/_components/V7Calendar.tsx` (new)
- Formulas (Log Formula): `src/app/app/formulas/page.tsx`
- Clients: `src/app/app/clients/page.tsx`
- Products: `src/app/app/products/page.tsx`
- Tasks: `src/app/app/tasks/page.tsx`
- Settings: `src/app/app/settings/page.tsx`
- UI components: `src/components/ui/` (badge, button, card, input, label, select, textarea)
- Cursor component: `src/components/BrassCursor.tsx` (new)
- Tailwind config: `tailwind.config.ts`

---

## Task 1: Global CSS — New Color Palette + Grain Overlay

**Files:**
- Modify: `src/app/globals.css`

Replace the entire file content. This is the foundation everything else builds on.

**Step 1: Replace globals.css**

```css
@import "tailwindcss";

:root {
  /* Background — olive-bark */
  --bark-deepest:    #1A1510;
  --bark:            #2C2418;
  --bark-mid:        #474033;
  --bark-warm:       #504536;
  --bark-light:      #5E5344;
  --bark-pale:       #6D6153;

  /* Cards — warm stone */
  --stone-lightest:  #E0D9CC;
  --stone-light:     #D8D0C1;
  --stone-mid:       #C8BFAE;
  --stone-warm:      #B8AD99;
  --stone-deep:      #A89D89;
  --stone-shadow:    #988D7A;
  --stone-card:      #D5CCBC;

  /* Garnet accent */
  --garnet-black:    #1E0A0F;
  --garnet-deep:     #3A1219;
  --garnet:          #6E2830;
  --garnet-vivid:    #8B353E;
  --garnet-ruby:     #A6434E;
  --garnet-blush:    #C4868F;
  --garnet-wash:     rgba(110,40,48,0.12);

  /* Brass accent */
  --brass:           #9E8750;
  --brass-warm:      #B59A5B;
  --brass-bright:    #D4B76A;
  --brass-soft:      rgba(181,154,91,0.45);
  --brass-line:      rgba(181,154,91,0.15);
  --brass-glow:      rgba(181,154,91,0.08);

  /* Olive accent */
  --olive-black:     #1A1E14;
  --olive-dark:      #2A3020;
  --olive:           #3E4632;
  --olive-mid:       #5C6148;
  --olive-sage:      #7E856A;
  --olive-wash:      rgba(62,70,50,0.1);

  /* Text on dark backgrounds */
  --text-on-bark:       #EDE8DE;
  --text-on-bark-dim:   rgba(237,232,222,0.75);
  --text-on-bark-faint: rgba(237,232,222,0.52);
  --text-on-bark-ghost: rgba(237,232,222,0.3);

  /* Text on light card backgrounds */
  --text-on-stone:       #1E1A14;
  --text-on-stone-dim:   #3D3832;
  --text-on-stone-faint: #635A50;
  --text-on-stone-ghost: #8A8070;

  /* Status colors */
  --status-confirmed: #4A8A5E;
  --status-pending:   #B59A3D;
  --status-low:       #B85560;

  /* Radii */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  10px;
  --radius-pill: 100px;

  --ease: cubic-bezier(0.19, 1, 0.22, 1);

  /* Legacy mappings for existing Tailwind classes */
  --background: var(--bark-mid);
  --foreground: var(--text-on-bark);
  --muted: var(--bark-light);
  --muted-foreground: var(--text-on-bark-faint);
  --border: var(--brass-line);
  --card: var(--stone-card);
}

*, *::before, *::after {
  border-color: var(--brass-line);
  cursor: none;
}

body {
  background: var(--bark-mid);
  color: var(--text-on-bark);
  font-family: 'DM Sans', sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
}

/* Grain texture overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 99990;
  mix-blend-mode: overlay;
}

/* Custom cursor elements */
.cursor-dot {
  width: 8px;
  height: 8px;
  background: var(--brass-warm);
  border-radius: 50%;
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  box-shadow: 0 0 8px rgba(181,154,91,0.35);
  transform: translate(-50%, -50%);
  transition: width 0.15s, height 0.15s, background 0.15s;
  left: -100px;
  top: -100px;
}
.cursor-ring {
  width: 34px;
  height: 34px;
  border: 1px solid var(--brass-soft);
  border-radius: 50%;
  position: fixed;
  pointer-events: none;
  z-index: 99998;
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s, border-color 0.2s;
  left: -100px;
  top: -100px;
}
.cursor-dot.hovering { width: 14px; height: 14px; background: var(--garnet-vivid); }
.cursor-ring.hovering { width: 52px; height: 52px; border-color: rgba(139,53,62,0.3); }

/* Widget wiggle animation (dashboard edit mode) */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(0.3deg); }
  75% { transform: rotate(-0.3deg); }
}
.wiggle { animation: wiggle 0.5s ease-in-out infinite; }

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bark-light); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--bark-pale); }

/* Focus styles */
:focus-visible {
  outline: 2px solid rgba(181,154,91,0.5);
  outline-offset: 2px;
}

/* Legacy utility class overrides */
.text-foreground { color: var(--text-on-bark); }
.text-muted-foreground { color: var(--text-on-bark-faint); }
.bg-card { background: var(--stone-card); }
.border-border { border-color: var(--brass-line); }
```

**Step 2: Verify dev server still starts**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npm run dev 2>&1 | head -20
```

Expected: no compile errors. The app will look broken visually — that's expected.

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/globals.css
git commit -m "style: replace global theme with v7 bark/stone/garnet palette"
```

---

## Task 2: Root Layout — Google Fonts + Cursor Component

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/BrassCursor.tsx`

The cursor is a `"use client"` component that attaches `mousemove` listeners — no unsafe HTML needed.

**Step 1: Create BrassCursor.tsx**

```tsx
"use client";

import { useEffect, useRef } from "react";

export function BrassCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
    };

    const bindHover = () => {
      document
        .querySelectorAll("a,button,input,select,textarea,[role='button']")
        .forEach((el) => {
          el.addEventListener("mouseenter", () => {
            dot?.classList.add("hovering");
            ring?.classList.add("hovering");
          });
          el.addEventListener("mouseleave", () => {
            dot?.classList.remove("hovering");
            ring?.classList.remove("hovering");
          });
        });
    };

    document.addEventListener("mousemove", onMove);
    bindHover();

    const observer = new MutationObserver(bindHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
```

**Step 2: Update layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { BrassCursor } from "@/components/BrassCursor";

export const metadata: Metadata = {
  title: "Opelle - Practitioner Suite",
  description: "The operating system for practitioner stylists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BrassCursor />
        {children}
      </body>
    </html>
  );
}
```

Note: Remove the `dark` class from `<html>`. Remove the old `gradient-mesh` and `pattern-overlay` divs.

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/layout.tsx src/components/BrassCursor.tsx
git commit -m "style: add v7 Google Fonts and brass cursor client component"
```

---

## Task 3: Sidebar — AppNav v7

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`
- Modify: `src/app/app/layout.tsx`

**Step 1: Restyle AppNav.tsx**

The sidebar changes:
- Width: `w-64` (256px) → `w-[170px]`
- Background: `bg-black/20 backdrop-blur-xl` → `bg-[#1A1E14]` (olive-black)
- Border: `border-white/10` → `border-[rgba(181,154,91,0.08)]`
- Brand: gradient text → Cormorant Garamond, `#D8D0C1`, 15px, 0.3em tracking
- Nav sections: add section headers (Main, Practice, Account)
- Nav items: 10px DM Sans, `rgba(237,232,222,0.55)`, active = stone-light + brass-glow bg + 2px brass-warm left bar
- Nav icons: 12px, opacity-50
- Add garnet "Log Formula" CTA button between nav and user profile
- User avatar: 26px circle, garnet-deep bg, garnet-blush text

```tsx
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
      { href: "/app/tasks", label: "History", icon: Clock },
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
        <Link href="/app/formulas">
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
```

**Step 2: Update app layout margin**

In `src/app/app/layout.tsx`, change `ml-64` to `ml-[170px]`:

```tsx
<main className="flex-1 ml-[170px] p-6">
  <div className="max-w-6xl mx-auto">
    {children}
  </div>
</main>
```

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/app/_components/AppNav.tsx src/app/app/layout.tsx
git commit -m "style: v7 sidebar — olive-black, brass nav, garnet CTA, Cormorant brand"
```

---

## Task 4: UI Components — v7 Restyle

**Files:**
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/label.tsx`
- Modify: `src/components/ui/select.tsx`

**Step 1: Update card.tsx**

Stone card bg, 8px radius, warm shadow:

```tsx
import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg transition-all duration-200", className)}
      style={{ background: "var(--stone-card)", boxShadow: "0 3px 14px rgba(0,0,0,0.16)", borderRadius: "8px", ...style }}
      {...props}
    />
  );
}

export function CardHeader({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("px-3 py-2", className)}
      style={{ borderBottom: "1px solid var(--stone-mid)", ...style }}
      {...props}
    />
  );
}

export function CardTitle({ className, style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(className)}
      style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400, ...style }}
      {...props}
    />
  );
}

export function CardDescription({ className, style, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(className)}
      style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "2px", ...style }}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn("px-3 py-2.5", className)} {...props} />;
}

export function CardFooter({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("px-3 py-2.5 flex items-center gap-3", className)}
      style={{ borderTop: "1px solid var(--stone-mid)", ...style }}
      {...props}
    />
  );
}
```

**Step 2: Update button.tsx**

Default = garnet, secondary = stone-mid, ghost = transparent:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", style, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      default: { background: "var(--garnet)", border: "1px solid var(--garnet-vivid)", color: "var(--stone-lightest)" },
      secondary: { background: "var(--stone-mid)", border: "1px solid var(--stone-warm)", color: "var(--text-on-stone)" },
      ghost: { background: "transparent", color: "var(--text-on-bark-dim)" },
      danger: { background: "var(--status-low)", border: "1px solid var(--garnet-ruby)", color: "white" },
    };
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: "4px 10px", fontSize: "10px" },
      md: { padding: "7px 16px", fontSize: "11px" },
      lg: { padding: "10px 24px", fontSize: "13px" },
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        style={{
          borderRadius: "6px",
          letterSpacing: "0.04em",
          fontFamily: "'DM Sans', sans-serif",
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
```

**Step 3: Update badge.tsx**

```tsx
import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", style, ...props }: BadgeProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: { background: "var(--stone-mid)", color: "var(--text-on-stone)" },
    success: { background: "rgba(74,138,94,0.2)", color: "var(--status-confirmed)" },
    warning: { background: "rgba(181,154,61,0.2)", color: "var(--status-pending)" },
    danger: { background: "rgba(184,85,96,0.2)", color: "var(--status-low)" },
    outline: { border: "1px solid var(--stone-mid)", color: "var(--text-on-stone-faint)", background: "transparent" },
  };
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5", className)}
      style={{
        borderRadius: "100px",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        fontFamily: "'DM Sans', sans-serif",
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    />
  );
}
```

**Step 4: Update input.tsx, textarea.tsx, label.tsx, select.tsx**

All form elements use stone card bg, stone-mid border, brass focus ring. Use React event handlers instead of inline JS for focus states.

`input.tsx`:
```tsx
"use client";
import { cn } from "@/lib/utils";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <input
        type={type}
        className={cn("w-full transition-all duration-200", className)}
        style={{
          padding: "10px 14px",
          border: `1px solid ${focused ? "var(--brass)" : "var(--stone-mid)"}`,
          borderRadius: "8px",
          background: "rgba(0,0,0,0.04)",
          color: "var(--text-on-stone)",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          outline: "none",
          boxShadow: focused ? "0 0 0 2px rgba(181,154,91,0.1)" : "none",
          ...style,
        }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
export { Input };
export type InputProps = InputHTMLAttributes<HTMLInputElement>;
```

`textarea.tsx`:
```tsx
"use client";
import { cn } from "@/lib/utils";
import { forwardRef, useState, type TextareaHTMLAttributes } from "react";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <textarea
        className={cn("w-full transition-all duration-200 resize-none", className)}
        style={{
          padding: "12px 14px",
          border: `1px solid ${focused ? "var(--brass)" : "var(--stone-mid)"}`,
          borderRadius: "8px",
          background: "rgba(0,0,0,0.04)",
          color: "var(--text-on-stone)",
          fontSize: "14px",
          lineHeight: "1.8",
          fontFamily: "'DM Sans', sans-serif",
          minHeight: "100px",
          outline: "none",
          boxShadow: focused ? "0 0 0 2px rgba(181,154,91,0.1)" : "none",
          ...style,
        }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
export { Textarea };
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
```

`label.tsx`:
```tsx
"use client";
import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, style, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block", className)}
      style={{
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--text-on-stone)",
        marginBottom: "4px",
        fontFamily: "'DM Sans', sans-serif",
        ...style,
      }}
      {...props}
    />
  )
);
Label.displayName = "Label";
export { Label };
```

`select.tsx`:
```tsx
"use client";
import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, style, ...props }, ref) => (
    <select
      className={cn("w-full transition-all duration-200 appearance-none", className)}
      style={{
        padding: "10px 14px",
        border: "1px solid var(--stone-mid)",
        borderRadius: "8px",
        background: "var(--stone-card)",
        color: "var(--text-on-stone)",
        fontSize: "14px",
        fontFamily: "'DM Sans', sans-serif",
        outline: "none",
        ...style,
      }}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
export { Select };
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
```

**Step 5: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/components/ui/
git commit -m "style: v7 UI components — stone cards, garnet buttons, brass focus"
```

---

## Task 5: Dashboard — Widget System

**Files:**
- Create: `src/app/app/_components/WidgetDashboard.tsx`
- Modify: `src/app/app/page.tsx`

The dashboard page does data fetching server-side — keep all that. Pass fetched data to a new client component `WidgetDashboard`.

**Step 1: Create WidgetDashboard.tsx**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Link from "next/link";
import { FlaskConical, Trash2, Maximize2, Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────
type WidgetType = "schedule" | "revenue" | "formulas" | "tasks" | "activity" | "inventory";

interface Widget {
  id: string;
  type: WidgetType;
  cols: 1 | 2 | 3;
  rows: 1 | 2;
}

const SIZE_OPTIONS = [
  { label: "S", cols: 1 as const, rows: 1 as const },
  { label: "M", cols: 1 as const, rows: 2 as const },
  { label: "W", cols: 2 as const, rows: 1 as const },
  { label: "L", cols: 2 as const, rows: 2 as const },
  { label: "XL", cols: 3 as const, rows: 1 as const },
];

const ALL_WIDGET_TYPES: { type: WidgetType; label: string; defaultCols: 1|2|3; defaultRows: 1|2 }[] = [
  { type: "schedule", label: "Schedule", defaultCols: 2, defaultRows: 2 },
  { type: "revenue", label: "Revenue", defaultCols: 1, defaultRows: 1 },
  { type: "formulas", label: "Formulas", defaultCols: 1, defaultRows: 1 },
  { type: "tasks", label: "Tasks", defaultCols: 2, defaultRows: 1 },
  { type: "activity", label: "Activity", defaultCols: 1, defaultRows: 1 },
  { type: "inventory", label: "Inventory", defaultCols: 3, defaultRows: 1 },
];

const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "schedule", cols: 2, rows: 2 },
  { id: "w2", type: "revenue", cols: 1, rows: 1 },
  { id: "w3", type: "formulas", cols: 1, rows: 1 },
  { id: "w4", type: "tasks", cols: 2, rows: 1 },
  { id: "w5", type: "activity", cols: 1, rows: 1 },
  { id: "w6", type: "inventory", cols: 3, rows: 1 },
];

// ── Props ──────────────────────────────────────────────────────────────
interface Appointment { id: string; startAt: string; clientId: string; serviceName: string; status: string; }
interface Formula { id: string; }
interface Task { id: string; title: string; status: string; dueAt?: string; }
interface Product { id: string; brand: string; shade?: string; quantity?: number; lowStockThreshold?: number; }
interface Client { id: string; firstName?: string; lastName?: string; preferredName?: string; }

interface WidgetDashboardProps {
  appointments: Appointment[];
  formulas: Formula[];
  tasks: Task[];
  products: Product[];
  clients: Client[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function getClientName(clients: Client[], id: string) {
  const c = clients.find((c) => c.id === id);
  if (!c) return "Unknown";
  return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
}

// ── Draggable Widget Shell ─────────────────────────────────────────────
function DraggableWidget({
  widget, editMode, onDelete, onResize, children,
}: {
  widget: Widget; editMode: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, cols: 1|2|3, rows: 1|2) => void;
  children: React.ReactNode;
}) {
  const [showSizePicker, setShowSizePicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "WIDGET",
    item: { id: widget.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => editMode,
  });

  const [, drop] = useDrop({
    accept: "WIDGET",
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={editMode ? "wiggle" : ""}
      style={{
        gridColumn: `span ${widget.cols}`,
        gridRow: `span ${widget.rows}`,
        background: "var(--stone-card)",
        borderRadius: "8px",
        boxShadow: "0 3px 14px rgba(0,0,0,0.16)",
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        overflow: "visible",
        minHeight: widget.rows === 2 ? "280px" : "140px",
      }}
    >
      {editMode && (
        <div style={{ position: "absolute", top: "6px", right: "6px", zIndex: 20, display: "flex", gap: "4px" }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSizePicker(!showSizePicker); }}
              style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--brass-warm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
            >
              <Maximize2 size={11} />
            </button>
            {showSizePicker && (
              <div style={{ position: "absolute", top: "26px", right: 0, background: "var(--stone-card)", borderRadius: "6px", padding: "6px", display: "flex", gap: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", border: "1px solid var(--stone-mid)", zIndex: 30 }}>
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={(e) => { e.stopPropagation(); onResize(widget.id, s.cols, s.rows); setShowSizePicker(false); }}
                    style={{ width: "28px", height: "24px", borderRadius: "4px", background: widget.cols === s.cols && widget.rows === s.rows ? "var(--brass)" : "var(--stone-mid)", color: "var(--text-on-stone)", fontSize: "9px", border: "none", fontWeight: 600 }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
            style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--status-low)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Widget Head ────────────────────────────────────────────────────────
function WidgetHead({ title, link }: { title: string; link: string }) {
  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--stone-mid)" }}>
      <Link href={link}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400 }}>
          {title}
        </p>
      </Link>
    </div>
  );
}

// ── Stat Widget ────────────────────────────────────────────────────────
function StatWidget({ value, label, change, changePositive, link }: {
  value: string; label: string; change?: string; changePositive?: boolean; link: string;
}) {
  return (
    <Link href={link} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--stone-mid)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400 }}>
          {label.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
        </p>
      </div>
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--text-on-stone)", fontWeight: 300, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", marginTop: "6px" }}>
          {label}
        </p>
        {change && (
          <p style={{ fontSize: "9px", color: changePositive ? "var(--status-confirmed)" : "var(--status-low)", marginTop: "4px" }}>
            {change}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export function WidgetDashboard({ appointments, formulas, tasks, products, clients }: WidgetDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  const todayAppts = appointments.filter((a) => { const d = new Date(a.startAt); return d >= today && d <= todayEnd; });
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  const deleteWidget = useCallback((id: string) => setWidgets((p) => p.filter((w) => w.id !== id)), []);
  const resizeWidget = useCallback((id: string, cols: 1|2|3, rows: 1|2) =>
    setWidgets((p) => p.map((w) => w.id === id ? { ...w, cols, rows } : w)), []);
  const addWidget = (type: WidgetType) => {
    const def = ALL_WIDGET_TYPES.find((t) => t.type === type);
    if (!def) return;
    setWidgets((p) => [...p, { id: `w${Date.now()}`, type, cols: def.defaultCols, rows: def.defaultRows }]);
    setShowAddMenu(false);
  };

  const renderContent = (widget: Widget) => {
    switch (widget.type) {
      case "schedule":
        return (
          <>
            <WidgetHead title="Today's Schedule" link="/app/appointments" />
            <div style={{ padding: "10px 12px", overflow: "auto", height: "calc(100% - 37px)" }}>
              {todayAppts.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)", textAlign: "center", paddingTop: "20px" }}>No appointments today</p>
              ) : todayAppts.map((appt) => {
                const isPast = new Date(appt.startAt) < now;
                return (
                  <div key={appt.id} style={{ padding: "6px 8px", borderRadius: "6px", marginBottom: "6px", background: isPast ? "rgba(0,0,0,0.05)" : "var(--garnet-wash)", opacity: isPast ? 0.55 : 1, borderLeft: `2px solid ${appt.status === "completed" ? "var(--status-confirmed)" : "var(--garnet-vivid)"}` }}>
                    <p style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-on-stone)" }}>{getClientName(clients, appt.clientId)}</p>
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{appt.serviceName} · {new Date(appt.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                );
              })}
            </div>
          </>
        );
      case "revenue":
        return <StatWidget value="—" label="Earned Today" change="See appointments" changePositive={true} link="/app/appointments" />;
      case "formulas":
        return <StatWidget value={String(formulas.length)} label="Active Formulas" change={`${formulas.length} total`} changePositive={formulas.length > 0} link="/app/formulas" />;
      case "tasks":
        return (
          <>
            <WidgetHead title="Tasks" link="/app/tasks" />
            <div style={{ padding: "8px 12px" }}>
              {pendingTasks.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>All done!</p>
              ) : pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "1px solid var(--stone-mid)" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "3px", border: "1px solid var(--stone-warm)", flexShrink: 0 }} />
                  <p style={{ fontSize: "10px", color: "var(--text-on-stone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</p>
                </div>
              ))}
            </div>
          </>
        );
      case "activity":
        return (
          <>
            <WidgetHead title="Activity" link="/app/clients" />
            <div style={{ padding: "8px 12px" }}>
              {todayAppts.slice(0, 4).map((appt) => (
                <div key={appt.id} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--stone-mid)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--garnet)", marginTop: "4px", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "10px", color: "var(--text-on-stone)" }}>{getClientName(clients, appt.clientId)}</p>
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{new Date(appt.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              {todayAppts.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No activity today</p>}
            </div>
          </>
        );
      case "inventory":
        return (
          <>
            <WidgetHead title="Inventory" link="/app/products" />
            <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {products.slice(0, 8).map((p) => {
                const isLow = p.quantity !== undefined && p.lowStockThreshold !== undefined && p.quantity <= p.lowStockThreshold;
                return (
                  <span key={p.id} style={{ padding: "3px 8px", borderRadius: "100px", fontSize: "9px", background: isLow ? "rgba(184,85,96,0.15)" : "var(--stone-mid)", color: isLow ? "var(--status-low)" : "var(--text-on-stone)", border: isLow ? "1px solid rgba(184,85,96,0.3)" : "none" }}>
                    {isLow ? "⚠ " : ""}{p.brand}{p.shade ? ` ${p.shade}` : ""}
                  </span>
                );
              })}
              {products.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No products</p>}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>Practitioner Suite</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", color: "var(--text-on-bark)", fontWeight: 300, marginTop: "2px" }}>Dashboard</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {editMode && (
            <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: "var(--status-confirmed)", color: "white", border: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              <Plus size={11} /> Add Widget
            </button>
          )}
          <button onClick={() => { setEditMode(!editMode); setShowAddMenu(false); }} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: editMode ? "var(--garnet)" : "var(--stone-mid)", color: editMode ? "var(--stone-lightest)" : "var(--text-on-stone)", border: editMode ? "1px solid var(--garnet-vivid)" : "1px solid var(--stone-warm)" }}>
            {editMode ? "Done" : "Edit Widgets"}
          </button>
        </div>
      </div>

      {/* Add Widget Menu */}
      {showAddMenu && (
        <div style={{ background: "var(--stone-card)", borderRadius: "8px", padding: "12px", marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "8px", border: "1px solid var(--stone-mid)" }}>
          {ALL_WIDGET_TYPES.filter((t) => !widgets.find((w) => w.type === t.type)).map((t) => (
            <button key={t.type} onClick={() => addWidget(t.type)} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: "var(--stone-mid)", color: "var(--text-on-stone)", border: "1px solid var(--stone-warm)" }}>
              + {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Widget Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {widgets.map((widget) => (
          <DraggableWidget key={widget.id} widget={widget} editMode={editMode} onDelete={deleteWidget} onResize={resizeWidget}>
            {renderContent(widget)}
          </DraggableWidget>
        ))}
      </div>
    </DndProvider>
  );
}
```

**Step 2: Update dashboard page.tsx**

Add import and pass data to WidgetDashboard. Check whether `listProducts` exists in `src/lib/db/`:

```bash
ls /Users/anabellelord/Opelle/opelle-app-github/src/lib/db/
```

If `products.ts` exists, import `listProducts` and add it to the `Promise.all`. If not, pass `products={[]}`.

At the top of `src/app/app/page.tsx`, add:
```tsx
import { WidgetDashboard } from "./_components/WidgetDashboard";
```

Replace the entire `return (...)` block with:
```tsx
return (
  <WidgetDashboard
    appointments={allAppointments}
    formulas={formulas}
    tasks={tasks}
    products={[]} // or listProducts() result if available
    clients={clients}
  />
);
```

Keep all existing imports and the `Promise.all` data fetching above — only swap the return.

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/app/_components/WidgetDashboard.tsx src/app/app/page.tsx
git commit -m "feat: v7 draggable widget dashboard with react-dnd"
```

---

## Task 6: Appointments — Full Calendar (Day/Week/Month)

**Files:**
- Create: `src/app/app/appointments/_components/V7Calendar.tsx`
- Modify: `src/app/app/appointments/page.tsx`

**Step 1: Create V7Calendar.tsx**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type View = "day" | "week" | "month";

interface Appointment {
  id: string;
  startAt: string;
  clientId: string;
  serviceName: string;
  status: string;
}

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
}

interface V7CalendarProps {
  appointments: Appointment[];
  clients: Client[];
}

function getClientName(clients: Client[], id: string) {
  const c = clients.find((c) => c.id === id);
  if (!c) return "Unknown";
  return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function statusColor(status: string) {
  if (status === "completed") return "var(--status-confirmed)";
  if (status === "cancelled") return "var(--status-low)";
  return "var(--garnet-vivid)";
}

function formatHour(h: number) {
  if (h === 12) return "12PM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

export function V7Calendar({ appointments, clients }: V7CalendarProps) {
  const [view, setView] = useState<View>("week");
  const [current, setCurrent] = useState(new Date());
  const today = new Date();

  const navigate = (dir: -1 | 1) => {
    const d = new Date(current);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCurrent(d);
  };

  const headerLabel = () => {
    if (view === "day") return `${DAY_NAMES[current.getDay()]}, ${MONTH_NAMES[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
  };

  const DayView = () => {
    const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), current));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr" }}>
        {HOURS.map((hour) => {
          const slotAppts = dayAppts.filter((a) => new Date(a.startAt).getHours() === hour);
          return (
            <div key={hour} style={{ display: "contents" }}>
              <div style={{ padding: "10px 8px 8px 0", textAlign: "right", fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                {formatHour(hour)}
              </div>
              <div style={{ borderTop: "1px solid var(--stone-mid)", padding: "4px 0 4px 8px", minHeight: "52px" }}>
                {slotAppts.map((appt) => (
                  <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                    <div style={{ padding: "6px 10px", borderRadius: "6px", marginBottom: "4px", background: "rgba(0,0,0,0.04)", borderLeft: `3px solid ${statusColor(appt.status)}` }}>
                      <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>{getClientName(clients, appt.clientId)}</p>
                      <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{appt.serviceName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const WeekView = () => {
    const ws = startOfWeek(current);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", marginBottom: "4px" }}>
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <button key={day.toISOString()} onClick={() => { setCurrent(day); setView("day"); }}
                style={{ textAlign: "center", padding: "6px 2px", borderRadius: "6px", background: isToday ? "var(--garnet-wash)" : "transparent", border: "none" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{DAY_NAMES[day.getDay()]}</p>
                <p style={{ fontSize: "16px", fontFamily: "'Fraunces', serif", color: isToday ? "var(--garnet-ruby)" : "var(--text-on-stone)", fontWeight: 300 }}>{day.getDate()}</p>
              </button>
            );
          })}
        </div>
        {HOURS.map((hour) => (
          <div key={hour} style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", textAlign: "right", paddingRight: "8px", paddingTop: "8px" }}>{formatHour(hour)}</div>
            {days.map((day) => {
              const slotAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day) && new Date(a.startAt).getHours() === hour);
              return (
                <div key={day.toISOString()} style={{ borderTop: "1px solid var(--stone-mid)", borderLeft: "1px solid var(--stone-mid)", padding: "3px", minHeight: "44px" }}>
                  {slotAppts.map((appt) => (
                    <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                      <div style={{ padding: "2px 5px", borderRadius: "4px", marginBottom: "2px", background: "rgba(0,0,0,0.04)", borderLeft: `2px solid ${statusColor(appt.status)}`, fontSize: "9px", color: "var(--text-on-stone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getClientName(clients, appt.clientId)}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const MonthView = () => {
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const startPad = firstDay.getDay();
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    const cells = Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(firstDay);
      d.setDate(1 - startPad + i);
      return d;
    });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "9px", color: "var(--text-on-stone-faint)", padding: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
          {cells.map((day, i) => {
            const inMonth = day.getMonth() === current.getMonth();
            const isToday = isSameDay(day, today);
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day));
            return (
              <button key={i} onClick={() => { setCurrent(day); setView("day"); }}
                style={{ minHeight: "72px", padding: "4px 6px", textAlign: "left", borderRadius: "6px", background: isToday ? "var(--garnet-wash)" : "transparent", border: "1px solid var(--stone-mid)", opacity: inMonth ? 1 : 0.35 }}>
                <p style={{ fontSize: "11px", fontFamily: "'Fraunces', serif", color: isToday ? "var(--garnet-ruby)" : "var(--text-on-stone)", fontWeight: 300 }}>{day.getDate()}</p>
                <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginTop: "4px" }}>
                  {dayAppts.slice(0, 3).map((a) => (
                    <div key={a.id} style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor(a.status) }} />
                  ))}
                  {dayAppts.length > 3 && <span style={{ fontSize: "8px", color: "var(--text-on-stone-faint)" }}>+{dayAppts.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const btnBase: React.CSSProperties = { borderRadius: "6px", background: "var(--stone-mid)", border: "1px solid var(--stone-warm)", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div>
      {/* Calendar header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => navigate(-1)} style={{ ...btnBase, width: "28px", height: "28px" }}><ChevronLeft size={14} style={{ color: "var(--text-on-stone)" }} /></button>
          <button onClick={() => navigate(1)} style={{ ...btnBase, width: "28px", height: "28px" }}><ChevronRight size={14} style={{ color: "var(--text-on-stone)" }} /></button>
          <button onClick={() => setCurrent(new Date())} style={{ ...btnBase, padding: "4px 10px", fontSize: "10px", color: "var(--text-on-stone)" }}>Today</button>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "16px", color: "var(--text-on-stone)", fontWeight: 300, marginLeft: "4px" }}>{headerLabel()}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", background: "var(--stone-mid)", borderRadius: "100px", padding: "2px", border: "1px solid var(--stone-warm)" }}>
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", background: view === v ? "var(--garnet)" : "transparent", color: view === v ? "var(--stone-lightest)" : "var(--text-on-stone)", border: "none", textTransform: "capitalize" }}>
                {v}
              </button>
            ))}
          </div>
          <Link href="/app/appointments/new">
            <button style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--garnet)", border: "1px solid var(--garnet-vivid)", color: "var(--stone-lightest)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Plus size={11} /> New Appointment
            </button>
          </Link>
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ background: "var(--stone-card)", borderRadius: "8px", padding: "12px", boxShadow: "0 3px 14px rgba(0,0,0,0.16)" }}>
        {view === "day" && <DayView />}
        {view === "week" && <WeekView />}
        {view === "month" && <MonthView />}
      </div>
    </div>
  );
}
```

**Step 2: Update appointments/page.tsx**

Replace the import:
```tsx
// Remove:
import { AppointmentsCalendar } from "./_components/AppointmentsCalendar";
// Add:
import { V7Calendar } from "./_components/V7Calendar";
```

Replace the return to use V7Calendar:
```tsx
return (
  <div>
    <div style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>Schedule</p>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest)", fontWeight: 300 }}>Appointments</h2>
    </div>
    <V7Calendar appointments={appointments} clients={clients} />
  </div>
);
```

Keep all existing data fetching unchanged.

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/app/appointments/
git commit -m "feat: v7 bespoke Day/Week/Month calendar"
```

---

## Task 7: Log Formula Page — v7 Styling

**Files:**
- Modify: `src/app/app/formulas/page.tsx`

Only the header and save button need updates. The Card/Input/Textarea/Label components already pull in v7 styles from Task 4.

**Step 1: Replace the header**

Find:
```tsx
<header className="space-y-2">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    Notepad
  </p>
  <h2 className="text-3xl font-semibold">Log Formula</h2>
  <p className="text-muted-foreground">
    Jot down what you mixed — AI will format it for you.
  </p>
</header>
```

Replace with:
```tsx
<header style={{ marginBottom: "20px" }}>
  <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)", marginBottom: "4px" }}>
    Notepad
  </p>
  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest)", fontWeight: 300 }}>
    Log Formula
  </h2>
  <p style={{ fontSize: "12px", color: "var(--text-on-bark-faint)", marginTop: "4px" }}>
    Jot down what you mixed — AI will format it for you.
  </p>
</header>
```

**Step 2: Update save button**

Find the save Button (the one with `FlaskConical` icon and `onClick={handleSave}`) and add a style override:
```tsx
<Button
  onClick={handleSave}
  disabled={saving || saved}
  className="w-full sm:w-auto"
  style={{ background: "var(--status-confirmed)", border: "1px solid var(--status-confirmed)" }}
>
```

**Step 3: Commit**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/app/formulas/page.tsx
git commit -m "style: v7 Log Formula page header and save button"
```

---

## Task 8: All Other Pages — Card System + Typography

**Files:**
- Modify: `src/app/app/clients/page.tsx`
- Modify: `src/app/app/products/page.tsx`
- Modify: `src/app/app/tasks/page.tsx`
- Modify: `src/app/app/settings/page.tsx`

**Clients page:**

1. Header section — replace Tailwind dark classes:
```tsx
// Replace:
<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">...</p>
<h2 className="text-3xl font-semibold">Clients</h2>
// With inline styles:
<p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>...</p>
<h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--stone-lightest)", fontWeight: 300 }}>Clients</h2>
```

2. Client card rows — find the `bg-white/5 border border-white/10` class pattern on clickable client divs and replace with stone-card style via the `Card` component or inline:
```tsx
// Replace className="... bg-white/5 border border-white/10 ..." with:
style={{ background: "var(--stone-card)", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
```

3. Avatar divs — find `bg-gradient-to-br from-emerald-400 to-cyan-400 text-black` and replace:
```tsx
style={{ background: "var(--garnet-deep)", color: "var(--garnet-blush)" }}
```

4. Client name text: `style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}`

5. Metadata (email, tags): `style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}`

**Products page:**

1. Same header pattern (Fraunces title, faint overline)
2. Product card rows: `background: "var(--stone-card)"`, `borderRadius: "8px"`
3. Category label: `style={{ color: "var(--brass)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}`
4. Low stock badge: `style={{ color: "var(--status-low)" }}`
5. In-stock badge: `style={{ color: "var(--status-confirmed)" }}`

**Tasks page:**

Tasks is a "use client" component with form + list. Focus changes:
1. Header typography
2. Task input area: already uses updated Input/Button from Task 4
3. Task card rows: find `bg-white/5 border border-white/10` and replace with `background: "var(--stone-card)"`, `borderBottom: "1px solid var(--stone-mid)"`
4. Completed checkbox: find the completed state styling and change from emerald to garnet: `background: "var(--garnet)"`, `borderColor: "var(--garnet)"`
5. Badge variants already updated via badge.tsx

**Settings page:**

1. Header typography
2. Profile card: `background: "var(--stone-card)"`, `borderRadius: "8px"`
3. Avatar: `background: "var(--garnet-deep)"`, `color: "var(--garnet-blush)"`
4. Label rows: label `fontSize: "11px", color: "var(--text-on-stone-faint)"`, value `fontSize: "14px", color: "var(--text-on-stone)"`
5. Danger zone: keep red but use `var(--status-low)` instead of Tailwind `text-red-*`

**Commit after all 4:**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add src/app/app/clients/ src/app/app/products/ src/app/app/tasks/ src/app/app/settings/
git commit -m "style: v7 card system across all pages — stone-card bg, Fraunces titles"
```

---

## Task 9: Tailwind Config — Color Aliases

**Files:**
- Modify: `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bark: {
          deepest: "#1A1510",
          DEFAULT: "#2C2418",
          mid: "#474033",
          warm: "#504536",
          light: "#5E5344",
          pale: "#6D6153",
        },
        stone: {
          lightest: "#E0D9CC",
          light: "#D8D0C1",
          mid: "#C8BFAE",
          warm: "#B8AD99",
          deep: "#A89D89",
          shadow: "#988D7A",
          card: "#D5CCBC",
        },
        garnet: {
          black: "#1E0A0F",
          deep: "#3A1219",
          DEFAULT: "#6E2830",
          vivid: "#8B353E",
          ruby: "#A6434E",
          blush: "#C4868F",
        },
        brass: {
          DEFAULT: "#9E8750",
          warm: "#B59A5B",
          bright: "#D4B76A",
        },
        olive: {
          black: "#1A1E14",
          dark: "#2A3020",
          DEFAULT: "#3E4632",
          mid: "#5C6148",
          sage: "#7E856A",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        brand: ["'Cormorant Garamond'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Commit:**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
git add tailwind.config.ts
git commit -m "style: v7 color palette and font aliases in Tailwind config"
```

---

## Task 10: Deploy Preview to Vercel

**Step 1: Check for existing Vercel config**

```bash
ls /Users/anabellelord/Opelle/opelle-app-github/.vercel/ 2>/dev/null || echo "No .vercel dir"
cat /Users/anabellelord/Opelle/opelle-app-github/.vercel/project.json 2>/dev/null || echo "No project.json"
```

**Step 2: Deploy to preview (not production)**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx vercel 2>&1
```

If not linked yet, it will prompt to link — follow the prompts. The deploy creates a preview URL like `https://opelle-app-xxxxx.vercel.app`.

**Step 3: Share preview URL**

Once deploy completes, output the preview URL to the user. Do NOT run `vercel --prod`.

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/app/globals.css` | Replace |
| `src/app/layout.tsx` | Replace |
| `src/components/BrassCursor.tsx` | Create |
| `tailwind.config.ts` | Replace |
| `src/app/app/layout.tsx` | Minor edit (ml-[170px]) |
| `src/app/app/_components/AppNav.tsx` | Replace |
| `src/app/app/_components/WidgetDashboard.tsx` | Create |
| `src/app/app/page.tsx` | Swap return to WidgetDashboard |
| `src/app/app/appointments/_components/V7Calendar.tsx` | Create |
| `src/app/app/appointments/page.tsx` | Swap component |
| `src/app/app/formulas/page.tsx` | Header + button style |
| `src/app/app/clients/page.tsx` | Card + avatar style |
| `src/app/app/products/page.tsx` | Card + badge style |
| `src/app/app/tasks/page.tsx` | Card + checkbox style |
| `src/app/app/settings/page.tsx` | Card style |
| `src/components/ui/card.tsx` | Replace |
| `src/components/ui/button.tsx` | Replace |
| `src/components/ui/badge.tsx` | Replace |
| `src/components/ui/input.tsx` | Replace |
| `src/components/ui/textarea.tsx` | Replace |
| `src/components/ui/label.tsx` | Replace |
| `src/components/ui/select.tsx` | Replace |

**Zero API routes or database files touched.**
