import { NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/db/clients";

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Failed to list clients:", error);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }

    const client = await createClient({
      firstName: body.firstName,
      lastName: body.lastName,
      pronouns: body.pronouns,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      tags: body.tags,
    });

    if (!client) {
      return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
