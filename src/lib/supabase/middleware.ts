import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass user ID to downstream server components via request header
  // so they don't need to call getUser() again (avoids stale rotated cookies)
  if (user) {
    request.headers.set("x-user-id", user.id);
    request.headers.set("x-user-email", user.email || "");

    // Rebuild response with updated request headers, preserving existing cookies
    const existingCookies: { name: string; value: string }[] = [];
    supabaseResponse.cookies.getAll().forEach((c) => {
      existingCookies.push({ name: c.name, value: c.value });
    });

    supabaseResponse = NextResponse.next({ request });

    // Re-apply cookies
    existingCookies.forEach(({ name, value }) => {
      supabaseResponse.cookies.set(name, value);
    });
  }

  return { supabaseResponse, user };
}
