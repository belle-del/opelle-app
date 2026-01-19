import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message,
      cookieCount: allCookies.length,
      supabaseCookies: allCookies.filter(c => c.name.includes('supabase')).map(c => c.name),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
