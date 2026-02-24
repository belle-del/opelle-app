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
