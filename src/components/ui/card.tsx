import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg transition-all duration-200", className)}
      style={{ background: "var(--stone-card)", boxShadow: "0 3px 14px rgba(0,0,0,0.16)", borderRadius: "8px", ...style }}
      {...props}
    />
  );
}

export function CardHeader({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("px-3 py-2", className)}
      style={{ borderBottom: "1px solid var(--stone-mid)", ...style }}
      {...props}
    />
  );
}

export function CardTitle({ className, style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(className)}
      style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400, ...style }}
      {...props}
    />
  );
}

export function CardDescription({ className, style, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(className)}
      style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "2px", ...style }}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn("px-3 py-2.5", className)} {...props} />;
}

export function CardFooter({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn("px-3 py-2.5 flex items-center gap-3", className)}
      style={{ borderTop: "1px solid var(--stone-mid)", ...style }}
      {...props}
    />
  );
}
