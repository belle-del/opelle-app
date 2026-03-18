import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients, listClientsForStylist } from "@/lib/db/clients";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { logActivity } from "@/lib/db/activity-log";

export async function GET(request: NextRequest) {
  try {
    const stylistId = request.nextUrl.searchParams.get("stylist");

    if (stylistId) {
      const workspace = await getCurrentWorkspace();
      if (!workspace) {
        return NextResponse.json({ error: "No workspace found" }, { status: 401 });
      }
      const clients = await listClientsForStylist(workspace.id, stylistId);
      return NextResponse.json(clients);
    }

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

    await logActivity("client.created", "client", client.id, [client.firstName, client.lastName].filter(Boolean).join(" "));
    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
