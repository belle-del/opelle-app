import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateAftercarePlan } from "@/lib/db/aftercare";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { clientVisibleNotes, publish } = body;

    const plan = await updateAftercarePlan(id, {
      clientVisibleNotes,
      publish,
    });

    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to update aftercare plan:", error);
    return NextResponse.json(
      { error: "Failed to update aftercare plan" },
      { status: 500 }
    );
  }
}
