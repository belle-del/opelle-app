import { NextResponse } from "next/server";
import { seedDefaultServiceTypes, listServiceTypes } from "@/lib/db/service-types";

export async function POST() {
  try {
    await seedDefaultServiceTypes();
    const types = await listServiceTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Failed to seed service types:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
