import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCallaConversations, createCallaConversation } from "@/lib/db/calla";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await listCallaConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("Calla conversations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const conversation = await createCallaConversation(user.id, body.title, body.mode);

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("Calla create conversation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
