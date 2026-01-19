import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";

  console.log("Auth callback - code present:", !!code);
  console.log("Auth callback - SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Auth callback - ANON_KEY present:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (code) {
    const cookieStore = await cookies();

    // Create response object first so we can set cookies on it
    const response = NextResponse.redirect(new URL(next, request.url));

    let cookiesSetCount = 0;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log("Setting cookies, count:", cookiesToSet.length);
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`Cookie ${name} options:`, JSON.stringify(options));

              // Set cookie in both the store AND the response
              try {
                cookieStore.set(name, value, options);
              } catch (e) {
                console.error("cookieStore.set failed:", e);
              }

              // Ensure proper cookie options for cross-origin
              const cookieOptions = {
                ...options,
                path: options.path || '/',
                sameSite: (options.sameSite as 'lax' | 'strict' | 'none') || 'lax',
                secure: options.secure !== false, // Default to true in production
                httpOnly: options.httpOnly !== false,
              };

              response.cookies.set(name, value, cookieOptions);
              cookiesSetCount++;
              console.log(`Set cookie: ${name} with options:`, JSON.stringify(cookieOptions));
            });
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    console.log("Exchange result - error:", error);
    console.log("Exchange result - session exists:", !!data.session);
    console.log("Exchange result - cookies set:", cookiesSetCount);

    if (!error) {
      return response;
    }

    console.error("Auth callback error:", error);
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
}
