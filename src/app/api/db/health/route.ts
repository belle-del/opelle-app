import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "db") {
    return NextResponse.json({ ok: false, mode: "demo" });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, mode: "db", clients: count ?? 0 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed.";
    return NextResponse.json({ ok: false, mode: "demo", error: message });
  }
}
