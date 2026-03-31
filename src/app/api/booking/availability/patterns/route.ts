import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import {
  listAvailabilityPatterns,
  upsertAvailabilityPattern,
} from "@/lib/db/availability";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") ?? undefined;

    const patterns = await listAvailabilityPatterns(workspaceId, userId);
    return NextResponse.json({ patterns });
  } catch (err) {
    console.error("[booking/availability/patterns GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const body = await request.json();
    const { userId, dayOfWeek, startTime, endTime, breakStart, breakEnd, effectiveFrom } = body;

    if (!userId || dayOfWeek === undefined || !startTime || !endTime || !effectiveFrom) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: "dayOfWeek must be 0–6" }, { status: 400 });
    }

    const pattern = await upsertAvailabilityPattern({
      workspace_id: workspaceId,
      user_id: userId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      break_start: breakStart ?? null,
      break_end: breakEnd ?? null,
      effective_from: effectiveFrom,
      effective_to: body.effectiveTo ?? null,
    });

    return NextResponse.json({ pattern }, { status: 201 });
  } catch (err) {
    console.error("[booking/availability/patterns POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
