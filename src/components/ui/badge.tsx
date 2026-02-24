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
