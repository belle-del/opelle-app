import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/db/clients";
import { formatDbError } from "@/lib/db/health";

const INVITE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateInviteToken = (length: number) => {
  const size = Math.max(10, Math.min(16, length));
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(size);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join(
      ""
    );
  }
  let token = "";
  for (let i = 0; i < size; i += 1) {
    token += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return token;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const p = await (context.params as Promise<{ id: string }> | { id: string });
    const id = p?.id;
    const payload = (await request.json()) as { action?: string };
    const action = payload.action ?? "ensure";
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (action === "ensure" && client.inviteToken && client.inviteUpdatedAt) {
      return NextResponse.json({
        ok: true,
        data: { token: client.inviteToken, updatedAt: client.inviteUpdatedAt },
      });
    }

    const token = generateInviteToken(12);
    const updated = await updateClient(id, {
      inviteToken: token,
      inviteUpdatedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      data: {
        token: updated.inviteToken ?? token,
        updatedAt: updated.inviteUpdatedAt ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
