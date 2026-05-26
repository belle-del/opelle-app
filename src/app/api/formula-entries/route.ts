import { NextResponse } from "next/server";
import { createFormulaEntry, listAllFormulaEntries } from "@/lib/db/formula-entries";
import { logActivity } from "@/lib/db/activity-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getMemberRole } from "@/lib/db/team";
import { isSchoolMode } from "@/lib/db/workspaces";
import { studentRequiresSupervision } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const serviceTypeId = searchParams.get("serviceTypeId") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const search = searchParams.get("search") || undefined;

    const entries = await listAllFormulaEntries({ clientId, serviceTypeId, dateFrom, dateTo, search });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list formula entries:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.serviceTypeId || !body.rawNotes?.trim()) {
      return NextResponse.json(
        { error: "clientId, serviceTypeId, and rawNotes are required" },
        { status: 400 }
      );
    }

    // school_mode supervision gate: if a student writes a formula entry
    // in a school-mode workspace, persist it as 'draft' so an instructor
    // can review before it shows up in the normal feed.
    let status: 'posted' | 'draft' = 'posted';
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const workspaceId = await getWorkspaceId(user.id);
        if (workspaceId) {
          const [memberInfo, schoolModeOn] = await Promise.all([
            getMemberRole(user.id, workspaceId),
            isSchoolMode(workspaceId),
          ]);
          if (memberInfo && studentRequiresSupervision(memberInfo.role, schoolModeOn)) {
            status = 'draft';
          }
        }
      }
    } catch (gateErr) {
      // Fail-closed-toward-current-behavior: if the gate lookup errors,
      // fall through with status='posted' (pre-school_mode default).
      console.error("[formula-entries] supervision gate lookup failed:", gateErr);
    }

    const entry = await createFormulaEntry({
      clientId: body.clientId,
      serviceTypeId: body.serviceTypeId,
      rawNotes: body.rawNotes.trim(),
      generalNotes: body.generalNotes?.trim() || undefined,
      serviceDate: body.serviceDate || undefined,
      status,
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    await logActivity("formula.created", "formula", entry.id, entry.serviceDate);
    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to create formula entry:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
