import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getExamQuestions,
  updateTopicPerformance,
  createStudySession,
  awardXp,
  checkAndAwardAchievements,
} from "@/lib/db/calla";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { questionId, answer, conversationId, sessionComplete, sessionStats } = body;

    if (!questionId || !answer) {
      return NextResponse.json({ error: "questionId and answer are required" }, { status: 400 });
    }

    // Look up the question by fetching all and filtering by ID
    const allQuestions = await getExamQuestions({});
    const question = allQuestions.find((q) => q.id === questionId);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const correct = answer === question.correctAnswer;

    // Update topic performance
    await updateTopicPerformance(user.id, question.domain, question.topic, correct);

    let xp = null;
    let newAchievements: Awaited<ReturnType<typeof checkAndAwardAchievements>> = [];

    // If session is complete, create study session and award XP
    if (sessionComplete && sessionStats) {
      const { questionsAttempted, questionsCorrect, durationMinutes, domains } = sessionStats;
      const accuracy = questionsAttempted > 0
        ? Math.round((questionsCorrect / questionsAttempted) * 100)
        : 0;

      await createStudySession(user.id, {
        conversationId,
        mode: "quiz",
        domains: domains || [],
        durationMinutes: durationMinutes || 0,
        questionsAttempted,
        questionsCorrect,
        topicsFlaggedWeak: [],
      });

      // Determine XP based on accuracy
      let baseXp = 25; // Below 70%
      if (accuracy >= 90) {
        baseXp = 100; // Ace
      } else if (accuracy >= 70) {
        baseXp = 50; // Pass
      }

      xp = await awardXp(user.id, "quiz_complete", baseXp, conversationId);
      newAchievements = await checkAndAwardAchievements(user.id);
    }

    return NextResponse.json({
      correct,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      xp,
      newAchievements,
    });
  } catch (err) {
    console.error("Quiz answer route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
