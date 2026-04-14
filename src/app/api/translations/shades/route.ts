import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listShades, createShades } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

interface ShadeInput {
  shade_code: string;
  shade_name: string;
  level: number;
  primary_tone: string;
  secondary_tone?: string;
}

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

    const colorLineId = req.nextUrl.searchParams.get("color_line_id");
    if (!colorLineId) {
      return NextResponse.json({ error: "color_line_id required" }, { status: 400 });
    }

    const shades = await listShades(colorLineId);
    return NextResponse.json({ shades });
  } catch (err) {
    console.error("Shades list error:", err);
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

    const { color_line_id, shades } = await req.json();
    if (!color_line_id || !Array.isArray(shades) || shades.length === 0) {
      return NextResponse.json({ error: "color_line_id and non-empty shades array required" }, { status: 400 });
    }

    const count = await createShades(color_line_id, shades.map((s: ShadeInput) => ({
      shadeCode: s.shade_code,
      shadeName: s.shade_name,
      level: s.level,
      primaryTone: s.primary_tone,
      secondaryTone: s.secondary_tone,
    })));

    return NextResponse.json({ inserted: count }, { status: 201 });
  } catch (err) {
    console.error("Shades create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
