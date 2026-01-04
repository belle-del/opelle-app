import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/client/login?error=1", url.origin));
  }

  try {
    const supabase = await createSupabaseAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/client/login?error=1", url.origin));
    }
    return NextResponse.redirect(new URL("/client", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/client/login?error=1", url.origin));
  }
}
