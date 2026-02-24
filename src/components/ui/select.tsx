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
