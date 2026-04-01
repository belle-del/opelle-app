"use client";

import type { TeamRole } from "@/lib/permissions";

const ROLE_STYLES: Record<TeamRole, { bg: string; color: string; label: string }> = {
  owner:       { bg: "rgba(196,171,112,0.15)", color: "#C4AB70", label: "Owner" },
  admin:       { bg: "rgba(143,173,200,0.15)", color: "#8FADC8", label: "Admin" },
  instructor:  { bg: "rgba(124,184,122,0.15)", color: "#7CB87A", label: "Instructor" },
  stylist:     { bg: "rgba(241,239,224,0.08)", color: "rgba(241,239,224,0.7)", label: "Stylist" },
  student:     { bg: "rgba(155,127,232,0.15)", color: "#9B7FE8", label: "Student" },
  front_desk:  { bg: "rgba(196,122,122,0.15)", color: "#C47A7A", label: "Front Desk" },
};

export function RoleBadge({ role }: { role: TeamRole }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.stylist;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: style.bg,
        color: style.color,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {style.label}
    </span>
  );
}
