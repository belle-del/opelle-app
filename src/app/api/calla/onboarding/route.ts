import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCallaProfile, createClassroomLog } from "@/lib/db/calla";
import { callaChat } from "@/lib/kernel";
import { buildCallaContext } from "@/lib/intelligence/buildCallaContext";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { programStage, primaryWorry, textbook, strongAreas, weakAreas, studyPreference, state, firstLogEntry } = body;

    if (!programStage) {
      return NextResponse.json({ error: "programStage is required" }, { status: 400 });
    }

    const profile = await createCallaProfile(user.id, {
      programStage,
      primaryWorry: primaryWorry || null,
      textbook: textbook || "Milady",
      strongAreas: strongAreas || [],
      weakAreas: weakAreas || [],
      studyPreference: studyPreference || [],
      state: state || "NM",
    });

    if (!profile) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    if (firstLogEntry?.trim()) {
      await createClassroomLog(user.id, {
        techniqueName: "First entry",
        notes: firstLogEntry.trim(),
      });
    }

    let welcomeMessage = null;
    const context = await buildCallaContext(user.id);
    if (context) {
      const result = await callaChat({
        message: `New student just completed onboarding. Generate a warm, personalized welcome message with 2-3 specific next actions based on their profile. They are ${programStage.replace(/_/g, " ")}, worried about ${primaryWorry || "the exam"}, using ${textbook || "Milady"}, and their weak areas are: ${(weakAreas || []).join(", ") || "not specified yet"}.${firstLogEntry ? ` They just shared: "${firstLogEntry}"` : ""}`,
        conversationHistory: [],
        studentContext: context as unknown as Record<string, unknown>,
      });
      welcomeMessage = result?.reply || null;
    }

    return NextResponse.json({ profile, welcomeMessage });
  } catch (err) {
    console.error("Calla onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
