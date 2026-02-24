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
