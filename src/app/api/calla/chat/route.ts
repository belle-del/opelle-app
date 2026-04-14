import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callaChat } from "@/lib/kernel";
import { buildCallaContext } from "@/lib/intelligence/buildCallaContext";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory = [], mode } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const context = await buildCallaContext(user.id);
    if (!context) {
      return NextResponse.json({ error: "Complete onboarding first" }, { status: 403 });
    }

    const result = await callaChat({
      message: message.trim(),
      conversationHistory,
      studentContext: context as unknown as Record<string, unknown>,
      mode,
    });

    if (!result) {
      return NextResponse.json({ error: "Calla is unavailable right now" }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calla chat error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
