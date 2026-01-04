import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE ?? null;
  const hasPublicUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (mode !== "db") {
    return NextResponse.json({
      ok: false,
      mode,
      hasPublicUrl,
      hasAnonKey,
      hasServiceRoleKey,
      dbProbeOk: false,
    });
  }

  const missing: string[] = [];
  if (!hasPublicUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!hasServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    return NextResponse.json({
      ok: false,
      mode,
      hasPublicUrl,
      hasAnonKey,
      hasServiceRoleKey,
      dbProbeOk: false,
      error: `Missing env: ${missing.join(", ")}`,
    });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      mode,
      hasPublicUrl,
      hasAnonKey,
      hasServiceRoleKey,
      dbProbeOk: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed.";
    const lower = message.toLowerCase();
    const dbProbeDetails =
      lower.includes("does not exist") || lower.includes("relation")
        ? "table missing: clients"
        : message;
    return NextResponse.json({
      ok: false,
      mode,
      hasPublicUrl,
      hasAnonKey,
      hasServiceRoleKey,
      dbProbeOk: false,
      dbProbeDetails,
      error: message,
    });
  }
}
