import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchStylists } from "@/lib/db/network";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const term = searchParams.get("q") || undefined;
    const specialty = searchParams.get("specialty") || undefined;
    const location = searchParams.get("location") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const results = await searchStylists({ term, specialty, location, limit });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search stylists error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
