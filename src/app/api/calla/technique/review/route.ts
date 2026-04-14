import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTechniqueReview, awardXp, checkAndAwardAchievements } from "@/lib/db/calla";
import { callaAnalyzeTechnique } from "@/lib/kernel";
import { buildCallaContext } from "@/lib/intelligence/buildCallaContext";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { photoUrl, techniqueCategory } = body;

    if (!photoUrl || !techniqueCategory) {
      return NextResponse.json({ error: "photoUrl and techniqueCategory are required" }, { status: 400 });
    }

    // Build student context for analysis
    const context = await buildCallaContext(user.id);

    // Analyze technique via kernel
    const result = await callaAnalyzeTechnique({
      imageUrl: photoUrl,
      techniqueCategory,
      studentContext: (context as unknown as Record<string, unknown>) ?? {},
    });

    if (!result) {
      return NextResponse.json({ error: "Technique analysis unavailable" }, { status: 503 });
    }

    // Create the review record
    const review = await createTechniqueReview(user.id, {
      photoUrl,
      techniqueCategory,
      analysis: result.analysis,
      feedbackText: result.feedbackText,
      score: result.score,
    });

    if (!review) {
      return NextResponse.json({ error: "Failed to save technique review" }, { status: 500 });
    }

    // Award XP: 40 base, plus 25 if improvement_delta >= 5
    let baseXp = 40;
    if (review.improvementDelta != null && review.improvementDelta >= 5) {
      baseXp += 25;
    }

    const xp = await awardXp(user.id, "technique_review", baseXp, review.id);
    const newAchievements = await checkAndAwardAchievements(user.id);

    return NextResponse.json({ review, xp, newAchievements });
  } catch (err) {
    console.error("Technique review route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
