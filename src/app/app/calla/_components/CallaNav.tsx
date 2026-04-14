"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GARNET = "#6B2737";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";

const TABS = [
  { href: "/app/calla", label: "Chat" },
  { href: "/app/calla/log", label: "Log" },
  { href: "/app/calla/stats", label: "Stats" },
];

export default function CallaNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app/calla") return pathname === "/app/calla";
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <nav
      style={{
        display: "flex",
        gap: "0",
        borderBottom: "1px solid #E5E3D3",
        padding: "0 24px",
        background: "#FAFAF5",
        flexShrink: 0,
      }}
    >
      {TABS.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: "10px 16px",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: active ? 600 : 400,
              color: active ? GARNET : TEXT_FAINT,
              textDecoration: "none",
              borderBottom: active ? `2px solid ${GARNET}` : "2px solid transparent",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = TEXT_PRIMARY;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = TEXT_FAINT;
              }
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
