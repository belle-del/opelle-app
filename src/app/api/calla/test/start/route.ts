import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExamQuestions, createCallaConversation } from "@/lib/db/calla";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get 60 random questions across all domains
    const allQuestions = await getExamQuestions({
      contentType: "question",
      limit: 60,
    });

    // Shuffle
    const questions = [...allQuestions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Create conversation in test mode
    const conversation = await createCallaConversation(user.id, "Practice Test", "test");

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        domain: q.domain,
        topic: q.topic,
        questionText: q.questionText,
        options: q.options,
        difficulty: q.difficulty,
      })),
      conversationId: conversation?.id ?? null,
      testSessionId: crypto.randomUUID(),
      timeLimit: 90,
    });
  } catch (err) {
    console.error("Test start route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
