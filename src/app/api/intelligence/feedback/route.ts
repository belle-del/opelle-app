import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFeedback, listFeedback, deleteFeedback } from "@/lib/db/metis-feedback";
import { logActivity } from "@/lib/db/activity-log";
import type { MetisFeedbackSource, MetisFeedbackType, MetisEntityType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") as MetisFeedbackSource | null;
    const feedbackType = searchParams.get("feedbackType") as MetisFeedbackType | null;
    const entityType = searchParams.get("entityType") as MetisEntityType | null;
    const entityId = searchParams.get("entityId") || undefined;

    const feedback = await listFeedback({
      source: source || undefined,
      feedbackType: feedbackType || undefined,
      entityType: entityType || undefined,
      entityId,
    });

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("Feedback list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { source, sourceId, originalContent, correction, feedbackType, entityType, entityId } = body;

    if (!source || !feedbackType) {
      return NextResponse.json({ error: "source and feedbackType are required" }, { status: 400 });
    }

    const feedback = await createFeedback({
      source,
      sourceId,
      originalContent,
      correction,
      feedbackType,
      entityType,
      entityId,
    });

    if (!feedback) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    await logActivity("metis.feedback", "metis", feedback.id, `${feedbackType}: ${(correction || "").substring(0, 50)}`);

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("Feedback create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ok = await deleteFeedback(id);
    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error("Feedback delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
