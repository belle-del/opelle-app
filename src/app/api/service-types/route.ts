import { NextResponse } from "next/server";
import { listServiceTypes, createServiceType } from "@/lib/db/service-types";
import { getCurrentWorkspace } from "@/lib/db/workspaces";

export async function GET() {
  try {
    console.log("[service-types GET] Starting...");
    const types = await listServiceTypes();
    console.log("[service-types GET] Found", types.length, "types");
    return NextResponse.json(types);
  } catch (error) {
    console.error("[service-types GET] Error:", error);
    return NextResponse.json({ error: "Failed to list service types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[service-types POST] Body:", JSON.stringify(body));

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Debug: check workspace first
    const workspace = await getCurrentWorkspace();
    console.log("[service-types POST] Workspace:", workspace ? workspace.id : "NULL");

    if (!workspace) {
      return NextResponse.json({ error: "No workspace found — user may not be authenticated" }, { status: 401 });
    }

    const serviceType = await createServiceType({
      name: body.name.trim(),
      sortOrder: body.sortOrder,
      defaultDurationMins: body.defaultDurationMins,
    });

    console.log("[service-types POST] Created:", serviceType ? serviceType.id : "NULL");

    if (!serviceType) {
      return NextResponse.json({ error: "Failed to create — check server logs for DB error" }, { status: 500 });
    }

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("[service-types POST] Error:", error);
    return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
  }
}
