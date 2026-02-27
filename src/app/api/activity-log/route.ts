import { NextResponse } from "next/server";
import { listActivityLog } from "@/lib/db/activity-log";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entries = await listActivityLog(entityType);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list activity log:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}
