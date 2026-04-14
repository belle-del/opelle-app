import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExamQuestions } from "@/lib/db/calla";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { domain } = await params;

    // V1: return all flashcards for the domain (skip mastered-topic exclusion)
    const flashcards = await getExamQuestions({
      domain,
      contentType: "flashcard",
      limit: 25,
    });

    return NextResponse.json({ flashcards });
  } catch (err) {
    console.error("Flashcards route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
