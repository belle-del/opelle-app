"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type ServiceInfo = {
  id: string;
  name: string;
  durationMins: number;
  bookingType: string;
};

type Props = {
  serviceTypes: ServiceInfo[];
};

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

export function ServiceSelector({ serviceTypes }: Props) {
  if (serviceTypes.length === 0) {
    return (
      <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
        <CardContent className="py-8 text-center">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif" }}>
            No services available yet
          </p>
          <p style={{ color: "var(--text-on-stone-ghost)", fontSize: "12px", marginTop: "4px" }}>
            Your stylist hasn&apos;t configured booking services yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p style={{ fontSize: "13px", color: "var(--stone-shadow)" }}>
        Select a service to get started
      </p>

      {serviceTypes.map(st => {
        const href = st.bookingType === "instant"
          ? `/client/book/slots?serviceId=${st.id}&serviceName=${encodeURIComponent(st.name)}&duration=${st.durationMins}`
          : `/client/book/request?serviceId=${st.id}&serviceName=${encodeURIComponent(st.name)}`;

        return (
          <Link key={st.id} href={href} style={{ textDecoration: "none", display: "block" }}>
            <Card className="transition-all active:scale-[0.98]">
              <CardContent className="py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: "15px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                      {st.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
                      {formatDuration(st.durationMins)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        background: st.bookingType === "instant" ? "rgba(196,171,112,0.15)" : "rgba(68,6,6,0.08)",
                        color: st.bookingType === "instant" ? "var(--brass)" : "var(--garnet)",
                      }}
                    >
                      {st.bookingType === "instant" ? "Instant" : "Request"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--stone-shadow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
