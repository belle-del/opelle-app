import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type } = await params;
    const admin = createSupabaseAdminClient();
    const validTypes = ["weekly_xp", "streak", "quiz_accuracy", "most_improved"];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid leaderboard type" }, { status: 400 });
    }

    let leaderboard: { rank: number; userId: string; displayName: string; metric: number }[] = [];

    if (type === "weekly_xp") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await admin
        .from("calla_xp_log")
        .select("user_id, xp_earned")
        .gte("created_at", sevenDaysAgo);

      // Aggregate by user
      const userXp: Record<string, number> = {};
      for (const row of data ?? []) {
        const uid = row.user_id as string;
        userXp[uid] = (userXp[uid] || 0) + (row.xp_earned as number);
      }

      leaderboard = Object.entries(userXp)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([userId, metric], i) => ({
          rank: i + 1,
          userId,
          displayName: `Student ${i + 1}`,
          metric,
        }));
    } else if (type === "streak") {
      const { data } = await admin
        .from("calla_progression")
        .select("user_id, current_streak")
        .order("current_streak", { ascending: false })
        .limit(20);

      leaderboard = (data ?? []).map((row: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        userId: row.user_id as string,
        displayName: `Student ${i + 1}`,
        metric: row.current_streak as number,
      }));
    } else if (type === "quiz_accuracy") {
      const { data } = await admin
        .from("calla_study_sessions")
        .select("user_id, accuracy_percentage")
        .eq("mode", "quiz");

      // Average accuracy per user
      const userAccuracy: Record<string, { total: number; count: number }> = {};
      for (const row of data ?? []) {
        const uid = row.user_id as string;
        if (!userAccuracy[uid]) userAccuracy[uid] = { total: 0, count: 0 };
        userAccuracy[uid].total += row.accuracy_percentage as number;
        userAccuracy[uid].count += 1;
      }

      leaderboard = Object.entries(userAccuracy)
        .map(([userId, stats]) => ({
          userId,
          metric: Math.round(stats.total / stats.count),
        }))
        .sort((a, b) => b.metric - a.metric)
        .slice(0, 20)
        .map((entry, i) => ({
          rank: i + 1,
          userId: entry.userId,
          displayName: `Student ${i + 1}`,
          metric: entry.metric,
        }));
    } else if (type === "most_improved") {
      const { data } = await admin
        .from("calla_technique_reviews")
        .select("user_id, improvement_delta")
        .not("improvement_delta", "is", null);

      // Sum improvement deltas per user
      const userImprovement: Record<string, number> = {};
      for (const row of data ?? []) {
        const uid = row.user_id as string;
        userImprovement[uid] = (userImprovement[uid] || 0) + (row.improvement_delta as number);
      }

      leaderboard = Object.entries(userImprovement)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([userId, metric], i) => ({
          rank: i + 1,
          userId,
          displayName: `Student ${i + 1}`,
          metric,
        }));
    }

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("Leaderboard route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
