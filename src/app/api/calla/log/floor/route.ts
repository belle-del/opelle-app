import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFloorLog, awardXp, checkAndAwardAchievements } from "@/lib/db/calla";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { serviceType, clientIdentifier, productsUsed, formulaNotes, photoUrls, outcomeNotes } = body;

    if (!serviceType?.trim()) {
      return NextResponse.json({ error: "serviceType is required" }, { status: 400 });
    }

    const log = await createFloorLog(user.id, {
      serviceType,
      clientIdentifier,
      productsUsed,
      formulaNotes,
      photoUrls,
      outcomeNotes,
    });

    if (!log) {
      return NextResponse.json({ error: "Failed to create floor log" }, { status: 500 });
    }

    const xp = await awardXp(user.id, "floor_log", 50, log.id);
    const newAchievements = await checkAndAwardAchievements(user.id);

    return NextResponse.json({ log, xp, newAchievements });
  } catch (err) {
    console.error("Floor log route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
