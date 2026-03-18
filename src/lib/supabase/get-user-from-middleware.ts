import { headers } from "next/headers";

/**
 * Get user ID from middleware-set headers.
 * Falls back to cookie-based auth if headers aren't present.
 * Use this instead of calling getUser() in server components to avoid
 * stale cookie issues caused by token rotation in middleware.
 */
export async function getUserIdFromMiddleware(): Promise<string | null> {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (userId) return userId;

  // Fallback: try cookie-based auth
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getUserEmailFromMiddleware(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-user-email") || null;
}
