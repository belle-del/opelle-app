import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Protected routes for stylists
  if (pathname.startsWith("/app")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Client portal — /client/join, /client/login, /client/auth are public
  const clientPublicPaths = ["/client/join", "/client/login", "/client/auth"];
  const isClientPublic = clientPublicPaths.some(p => pathname.startsWith(p));

  if (pathname.startsWith("/client") && !isClientPublic) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/client/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && user) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const url = request.nextUrl.clone();
    url.pathname = redirect || "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
