import { NextResponse } from "next/server";
import { releaseExpiredPendingAppointments } from "@/lib/db/appointments";

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseExpiredPendingAppointments();
    return NextResponse.json({ released });
  } catch (error) {
    console.error("[cron/release-pending] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
