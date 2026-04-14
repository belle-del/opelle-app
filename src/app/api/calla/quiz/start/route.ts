import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTopicPerformance,
  getExamQuestions,
  createCallaConversation,
} from "@/lib/db/calla";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { domain } = body;

    // Find weak areas to weight questions
    const performance = await getTopicPerformance(user.id);
    const weakTopics = performance.filter((p) => p.flaggedWeak);

    let questions;

    if (weakTopics.length > 0 && !domain) {
      // Get 7 questions from weak topics, 3 from others
      const weakDomains = [...new Set(weakTopics.map((t) => t.domain))];
      const weakQuestions = await getExamQuestions({
        contentType: "question",
        limit: 7,
      });
      // Filter to weak domain questions
      const fromWeak = weakQuestions.filter((q) => weakDomains.includes(q.domain)).slice(0, 7);
      const weakIds = fromWeak.map((q) => q.id);

      const otherQuestions = await getExamQuestions({
        contentType: "question",
        limit: 10,
        excludeIds: weakIds,
      });
      const fromOther = otherQuestions
        .filter((q) => !weakDomains.includes(q.domain))
        .slice(0, 3);

      questions = [...fromWeak, ...fromOther].slice(0, 10);

      // If we didn't get enough, fill up to 10
      if (questions.length < 10) {
        const fillIds = questions.map((q) => q.id);
        const fill = await getExamQuestions({
          contentType: "question",
          limit: 10 - questions.length,
          excludeIds: fillIds,
        });
        questions = [...questions, ...fill].slice(0, 10);
      }
    } else {
      // Random 10 (optionally filtered by domain)
      questions = await getExamQuestions({
        domain,
        contentType: "question",
        limit: 10,
      });
    }

    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Create conversation in quiz mode
    const conversation = await createCallaConversation(user.id, "Quiz Session", "quiz");

    return NextResponse.json({
      questions,
      conversationId: conversation?.id ?? null,
    });
  } catch (err) {
    console.error("Quiz start route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
