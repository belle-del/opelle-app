import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudentRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isClientRoute = pathname === "/client" || pathname.startsWith("/client/");

  if (!isStudentRoute && !isClientRoute) {
    return NextResponse.next();
  }

  if (isClientRoute) {
    if (
      pathname === "/client/login" ||
      pathname.startsWith("/client/auth/callback") ||
      pathname.startsWith("/client/invite/")
    ) {
      return NextResponse.next();
    }
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (isStudentRoute) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/client/login", request.url));
  }

  const inviteToken =
    typeof user.user_metadata?.invite_token === "string"
      ? user.user_metadata.invite_token
      : "";

  if (!inviteToken && pathname !== "/client" && pathname !== "/client/profile") {
    return NextResponse.redirect(new URL("/client", request.url));
  }

  return response;
}
