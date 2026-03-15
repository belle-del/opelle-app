import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import {
  getOrCreateCommsPreferences,
  updateCommsPreferences,
} from "@/lib/db/comms-preferences";

export async function GET(request: Request) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const prefs = await getOrCreateCommsPreferences(workspace.id, clientId);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Failed to get comms preferences:", error);
    return NextResponse.json({ error: "Failed to get comms preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, emailEnabled, smsEnabled, rebookReminderWeeks, quietHoursStart, quietHoursEnd } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Ensure the record exists before updating
    await getOrCreateCommsPreferences(workspace.id, clientId);

    await updateCommsPreferences(workspace.id, clientId, {
      emailEnabled,
      smsEnabled,
      rebookReminderWeeks,
      quietHoursStart,
      quietHoursEnd,
    });

    const updated = await getOrCreateCommsPreferences(workspace.id, clientId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update comms preferences:", error);
    return NextResponse.json({ error: "Failed to update comms preferences" }, { status: 500 });
  }
}
