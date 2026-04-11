"use client";

import { ShieldCheck } from "lucide-react";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--olive)",
        background: "var(--olive-sage)",
        borderRadius: "var(--radius-pill)",
        padding: "2px 8px",
      }}
    >
      <ShieldCheck size={13} />
      Opélle Verified
    </span>
  );
}

export function TierBadge({
  tier,
}: {
  tier: "emerging" | "established" | "expert" | "master" | null;
}) {
  if (!tier) return null;

  const config = {
    emerging: { label: "Emerging", color: "var(--olive)" },
    established: { label: "Established", color: "var(--brass)" },
    expert: { label: "Expert", color: "var(--garnet)" },
    master: { label: "Master", color: "var(--garnet-deep)" },
  };

  const { label, color } = config[tier];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-pill)",
        padding: "2px 10px",
      }}
    >
      {label}
    </span>
  );
}
