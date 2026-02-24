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
