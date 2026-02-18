import { NextResponse } from "next/server";
import { listServiceTypes, createServiceType } from "@/lib/db/service-types";

export async function GET() {
  try {
    const types = await listServiceTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Failed to list service types:", error);
    return NextResponse.json({ error: "Failed to list service types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const serviceType = await createServiceType({
      name: body.name.trim(),
      sortOrder: body.sortOrder,
    });

    if (!serviceType) {
      return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
    }

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("Failed to create service type:", error);
    return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
  }
}
