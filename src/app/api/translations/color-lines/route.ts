import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listColorLines, createColorLine } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const brand = req.nextUrl.searchParams.get("brand") || undefined;
    const colorLines = await listColorLines(brand);
    return NextResponse.json({ colorLines });
  } catch (err) {
    console.error("Color lines list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { brand, line_name, type, characteristics } = await req.json();
    if (!brand || !line_name || !type) {
      return NextResponse.json({ error: "brand, line_name, and type are required" }, { status: 400 });
    }

    const colorLine = await createColorLine({ brand, lineName: line_name, type, characteristics });
    if (!colorLine) {
      return NextResponse.json({ error: "Failed to create color line" }, { status: 500 });
    }

    return NextResponse.json(colorLine, { status: 201 });
  } catch (err) {
    console.error("Color line create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
