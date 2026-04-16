import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession, updateSessionStatus } from "@/lib/db/service-sessions";
import { saveConsultation, getConsultation } from "@/lib/db/service-consultations";
import { publishEvent } from "@/lib/kernel";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const consultation = await getConsultation(sessionId, workspaceId);
    return NextResponse.json({ consultation });
  } catch (err) {
    console.error("Get consultation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const session = await getSession(sessionId, workspaceId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const body = await req.json();

    const consultation = await saveConsultation({
      workspaceId,
      sessionId,
      clientId: session.clientId,
      currentCondition: body.currentCondition,
      scalpCondition: body.scalpCondition,
      serviceRequested: body.serviceRequested,
      specificRequests: body.specificRequests,
      referencedInspoIds: body.referencedInspoIds,
      stylistNotes: body.stylistNotes,
      recommendedServices: body.recommendedServices,
      concerns: body.concerns,
      clientConfirmed: body.clientConfirmed,
    });

    if (!consultation) {
      return NextResponse.json({ error: "Failed to save consultation" }, { status: 500 });
    }

    // Move session to consultation status if still checked_in
    if (session.status === "checked_in") {
      await updateSessionStatus(sessionId, workspaceId, "consultation");
    }

    publishEvent({
      event_type: "service.consultation_saved",
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      payload: {
        session_id: sessionId,
        client_id: session.clientId,
        consultation_id: consultation.id,
      },
    }).catch(() => {});

    return NextResponse.json({ consultation });
  } catch (err) {
    console.error("Save consultation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
