import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE ?? null;
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (mode !== "db") {
    return NextResponse.json({
      ok: false,
      mode,
      hasUrl,
      hasAnon,
      hasServiceRole,
      dbProbeOk: false,
    });
  }

  const missing = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!hasServiceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    return NextResponse.json({
      ok: false,
      mode,
      hasUrl,
      hasAnon,
      hasServiceRole,
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
      hasUrl,
      hasAnon,
      hasServiceRole,
      dbProbeOk: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed.";
    return NextResponse.json({
      ok: false,
      mode,
      hasUrl,
      hasAnon,
      hasServiceRole,
      dbProbeOk: false,
      error: message,
    });
  }
}
