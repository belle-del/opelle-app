import { NextResponse } from "next/server";
import {
  deleteClient,
  getClient,
  updateClient,
} from "@/lib/db/clients";
import { formatDbError } from "@/lib/db/health";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getClient(params.id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const data = await updateClient(params.id, payload);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteClient(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
