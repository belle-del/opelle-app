import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-white/10 text-foreground",
        variant === "success" && "bg-emerald-500/20 text-emerald-300",
        variant === "warning" && "bg-amber-500/20 text-amber-300",
        variant === "danger" && "bg-red-500/20 text-red-300",
        variant === "outline" && "border border-white/20 text-foreground",
        className
      )}
      {...props}
    />
  );
}
