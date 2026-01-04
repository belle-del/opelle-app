import { NextResponse } from "next/server";
import type { ClientPacketV1 } from "@/lib/portal/packet";
import { lookupInvite } from "@/lib/portal/inviteDirectory";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

const MIN_TOKEN_LENGTH = 6;

const buildPacket = (token: string): ClientPacketV1 => {
  const record = lookupInvite(token);
  const now = new Date();
  const appointmentDate = new Date(now);
  appointmentDate.setDate(now.getDate() + 7);
  appointmentDate.setHours(10, 0, 0, 0);

  return {
    version: 1,
    token,
    stylist: {
      displayName: record?.stylistDisplay.displayName ?? "Belle",
      salonName: record?.stylistDisplay.salonName,
    },
    client: {
      firstName: record?.clientDisplay.firstName ?? "Client",
      lastName: record?.clientDisplay.lastName,
      pronouns: record?.clientDisplay.pronouns,
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

const serviceRoleConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim() ?? "";
  let token = queryToken;

  try {
    const supabase = await createSupabaseAuthServerClient();
    const { data } = await supabase.auth.getUser();
    const metadataToken =
      typeof data.user?.user_metadata?.invite_token === "string"
        ? data.user.user_metadata.invite_token
        : "";
    if (metadataToken) {
      token = metadataToken;
    }
  } catch {
    // ignore auth lookup failures and fall back to query token
  }

  if (token.length < MIN_TOKEN_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "invalid_token" },
      { status: 400 }
    );
  }

  if (!serviceRoleConfigured()) {
    return NextResponse.json({ ok: true, packet: buildPacket(token) });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, pronouns, invite_token, stylist_id")
      .eq("invite_token", token)
      .limit(1)
      .maybeSingle();

    if (clientError) throw clientError;
    if (!client) {
      return NextResponse.json(
        { ok: false, error: "unknown_token" },
        { status: 404 }
      );
    }

    const { data: nextAppointment, error: apptError } = await supabase
      .from("appointments")
      .select("service_name, start_at, duration_min")
      .eq("client_id", client.id)
      .eq("status", "scheduled")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (apptError) throw apptError;

    const { data: lastFormula, error: formulaError } = await supabase
      .from("formulas")
      .select("title, notes, updated_at")
      .eq("client_id", client.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (formulaError) throw formulaError;

    const now = new Date();
    const packet: ClientPacketV1 = {
      version: 1,
      token,
      stylist: {
        displayName: "Belle",
      },
      client: {
        firstName: client.first_name,
        lastName: client.last_name ?? undefined,
        pronouns: client.pronouns ?? undefined,
      },
      nextAppointment: nextAppointment
        ? {
            startAt: nextAppointment.start_at,
            serviceName: nextAppointment.service_name,
            durationMin: nextAppointment.duration_min,
          }
        : undefined,
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
      lastFormulaSummary: lastFormula
        ? {
            title: lastFormula.title,
            notes: lastFormula.notes ?? undefined,
          }
        : undefined,
      updatedAt: now.toISOString(),
    };

    return NextResponse.json({ ok: true, packet });
  } catch {
    return NextResponse.json(
      { ok: false, error: "packet_fetch_failed" },
      { status: 500 }
    );
  }
}
