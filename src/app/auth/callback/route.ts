import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a workspace, create one if not
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!workspace) {
          // Check if user is already a team member (joined via invite) — don't create a workspace
          const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
          const admin = createSupabaseAdminClient();
          const { data: membership } = await admin
            .from("workspace_members")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (!membership) {
            // New independent user — create their own workspace
            const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "My Workspace";
            await supabase
              .from("workspaces")
              .insert({ owner_id: user.id, name: `${name}'s Studio` });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
