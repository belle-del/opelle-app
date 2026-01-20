"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variants
          variant === "default" &&
            "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
          variant === "secondary" &&
            "bg-white/10 backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20",
          variant === "ghost" &&
            "text-foreground hover:bg-white/10",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-700",
          // Sizes
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
