"use client";
import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, style, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block", className)}
      style={{
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--text-on-stone)",
        marginBottom: "4px",
        fontFamily: "'DM Sans', sans-serif",
        ...style,
      }}
      {...props}
    />
  )
);
Label.displayName = "Label";
export { Label };
