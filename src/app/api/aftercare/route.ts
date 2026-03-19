import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAftercarePlanByAppointment,
  createAftercarePlan,
} from "@/lib/db/aftercare";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const body = await request.json();
    const { appointmentId, clientId, clientVisibleNotes, publish } = body;

    if (!appointmentId || !clientId) {
      return NextResponse.json(
        { error: "appointmentId and clientId required" },
        { status: 400 }
      );
    }

    // Check if one already exists
    const existing = await getAftercarePlanByAppointment(appointmentId);
    if (existing) {
      return NextResponse.json(
        { error: "Aftercare plan already exists for this appointment" },
        { status: 409 }
      );
    }

    const plan = await createAftercarePlan({
      workspaceId: workspace.id,
      appointmentId,
      clientId,
      clientVisibleNotes: clientVisibleNotes || "",
      publish: publish ?? false,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to create aftercare plan:", error);
    return NextResponse.json(
      { error: "Failed to create aftercare plan" },
      { status: 500 }
    );
  }
}
