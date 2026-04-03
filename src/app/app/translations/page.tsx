import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";
import { TranslationsPage } from "./_components/TranslationsPage";

export default async function TranslationsRoute() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("role, permissions")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  const role = (member?.role as TeamRole) || "student";
  const overrides = (member?.permissions as Record<string, boolean>) || {};

  if (!hasPermission(role, "translations.manage", overrides)) {
    redirect("/app");
  }

  return <TranslationsPage />;
}
