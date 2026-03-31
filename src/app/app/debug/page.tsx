import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";

export default async function DebugPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const workspaceId = await getWorkspaceId(user.id);

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, owner_id, allow_individual_availability, working_hours")
    .eq("id", workspaceId!)
    .single();

  const { data: patterns } = await admin
    .from("availability_patterns")
    .select("*")
    .eq("workspace_id", workspaceId!);

  const { data: overrides } = await admin
    .from("availability_overrides")
    .select("*")
    .eq("workspace_id", workspaceId!);

  // Also check what service types exist and their workspace_id
  const { data: services } = await admin
    .from("service_types")
    .select("id, name, workspace_id")
    .limit(5);

  const ownerMatchesUser = workspace?.owner_id === user.id;
  const patternsMatchOwner = patterns?.filter(p => p.user_id === workspace?.owner_id) ?? [];

  return (
    <div style={{ fontFamily: "monospace", fontSize: 13, padding: 24, maxWidth: 800 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", marginBottom: 16 }}>Availability Debug</h2>

      <section style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <b>Auth User</b>
        <pre style={{ margin: "8px 0 0" }}>{JSON.stringify({ id: user.id, email: user.email }, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <b>Workspace</b>
        <pre style={{ margin: "8px 0 0" }}>{JSON.stringify({
          id: workspace?.id,
          owner_id: workspace?.owner_id,
          allow_individual_availability: workspace?.allow_individual_availability,
          ownerMatchesAuthUser: ownerMatchesUser,
        }, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <b>Availability Patterns ({patterns?.length ?? 0} total, {patternsMatchOwner.length} matching owner)</b>
        <pre style={{ margin: "8px 0 0" }}>{JSON.stringify(patterns, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <b>Availability Overrides ({overrides?.length ?? 0} total)</b>
        <pre style={{ margin: "8px 0 0" }}>{JSON.stringify(overrides, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <b>Service Types (workspace_id these belong to)</b>
        <pre style={{ margin: "8px 0 0" }}>{JSON.stringify(services, null, 2)}</pre>
      </section>
    </div>
  );
}
