import { NextResponse } from "next/server";
import { getClient, updateClient, deleteClient } from "@/lib/db/clients";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = await getClient(id);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to get client:", error);
    return NextResponse.json({ error: "Failed to get client" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = await updateClient(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      pronouns: body.pronouns,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      tags: body.tags,
    });

    if (!client) {
      return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteClient(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
