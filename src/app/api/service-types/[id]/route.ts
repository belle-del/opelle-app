import { NextResponse } from "next/server";
import { updateServiceType, deleteServiceType } from "@/lib/db/service-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const serviceType = await updateServiceType(id, {
      name: body.name,
      sortOrder: body.sortOrder,
      defaultDurationMins: body.defaultDurationMins,
    });

    if (!serviceType) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("Failed to update service type:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteServiceType(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service type:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
