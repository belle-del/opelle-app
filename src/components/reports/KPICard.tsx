"use client";

import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function KPICard({ label, value, subtitle }: KPICardProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-on-stone-faint)" }}>
          {label}
        </p>
        <p style={{ fontSize: "22px", fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)", fontWeight: 400, marginTop: "2px" }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
