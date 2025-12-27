import { NextResponse } from "next/server";
import type { ClientPacketV1 } from "@/lib/portal/packet";

const MIN_TOKEN_LENGTH = 6;

const buildPacket = (token: string): ClientPacketV1 => {
  const now = new Date();
  const appointmentDate = new Date(now);
  appointmentDate.setDate(now.getDate() + 7);
  appointmentDate.setHours(10, 0, 0, 0);

  return {
    version: 1,
    token,
    stylist: { displayName: "Belle" },
    client: {
      firstName: "Client",
      lastName: token.slice(0, 4).toUpperCase(),
    },
    nextAppointment: {
      startAt: appointmentDate.toISOString(),
      serviceName: "Signature Refresh",
      durationMin: 60,
    },
    aftercare: {
      summary:
        "Focus on hydration, gentle cleansing, and heat protection this week.",
      do: [
        "Use a sulfate-free cleanser twice weekly.",
        "Apply a leave-in conditioner after showering.",
        "Schedule your touch-up in 6-8 weeks.",
      ],
      dont: [
        "Avoid high heat styling for 48 hours.",
        "Skip heavy oils on freshly treated hair.",
      ],
      rebookWindowDays: 42,
    },
    lastFormulaSummary: {
      title: "Root touch-up + gloss",
      notes: "Keep warmth balanced with cool tones.",
    },
    updatedAt: now.toISOString(),
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";

  if (token.length < MIN_TOKEN_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "invalid_token" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, packet: buildPacket(token) });
}
