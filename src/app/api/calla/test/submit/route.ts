import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getExamQuestions,
  updateTopicPerformance,
  createStudySession,
  awardXp,
  checkAndAwardAchievements,
} from "@/lib/db/calla";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { testSessionId, conversationId, answers, durationMinutes } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "answers array is required" }, { status: 400 });
    }

    // Fetch all questions to look up answers
    const allQuestions = await getExamQuestions({ contentType: "question", limit: 200 });
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

    let totalCorrect = 0;
    const domainStats: Record<string, { attempted: number; correct: number }> = {};
    const domains = new Set<string>();

    // Grade each answer and update topic performance
    for (const { questionId, answer } of answers) {
      const question = questionMap.get(questionId);
      if (!question) continue;

      const correct = answer === question.correctAnswer;
      if (correct) totalCorrect++;

      domains.add(question.domain);

      if (!domainStats[question.domain]) {
        domainStats[question.domain] = { attempted: 0, correct: 0 };
      }
      domainStats[question.domain].attempted++;
      if (correct) domainStats[question.domain].correct++;

      await updateTopicPerformance(user.id, question.domain, question.topic, correct);
    }

    const overall = answers.length > 0
      ? Math.round((totalCorrect / answers.length) * 100)
      : 0;

    const byDomain: Record<string, { attempted: number; correct: number; accuracy: number }> = {};
    for (const [domain, stats] of Object.entries(domainStats)) {
      byDomain[domain] = {
        attempted: stats.attempted,
        correct: stats.correct,
        accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0,
      };
    }

    // Create study session
    await createStudySession(user.id, {
      conversationId,
      mode: "test",
      domains: [...domains],
      durationMinutes: durationMinutes || 0,
      questionsAttempted: answers.length,
      questionsCorrect: totalCorrect,
    });

    // Award 150 base XP for completing a practice test
    const xp = await awardXp(user.id, "practice_test", 150, testSessionId);
    const newAchievements = await checkAndAwardAchievements(user.id);

    return NextResponse.json({
      score: { overall, byDomain },
      xp,
      newAchievements,
      passed: overall >= 75,
    });
  } catch (err) {
    console.error("Test submit route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
