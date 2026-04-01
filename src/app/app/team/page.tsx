import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listTeamMembers } from "@/lib/db/team";
import { requirePermission } from "@/lib/db/team";
import { TeamList } from "./_components/TeamList";
import { InviteButton } from "./_components/InviteButton";

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const auth = await requirePermission("team.view");
  if (!auth) redirect("/app");

  const members = await listTeamMembers(auth.workspaceId);

  // Check if user can manage (for showing invite button)
  const canManageAuth = await requirePermission("team.manage");
  const canManage = !!canManageAuth;

  return (
    <div className="space-y-6">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
            Manage
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
            Team
          </h2>
          <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", marginTop: "4px" }}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && <InviteButton />}
      </header>

      {members.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "rgba(241,239,224,0.03)", borderRadius: "12px",
          border: "1px solid rgba(241,239,224,0.06)",
        }}>
          <p style={{ fontSize: "14px", color: "rgba(241,239,224,0.5)", marginBottom: "8px" }}>
            No team members yet
          </p>
          <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.3)" }}>
            Invite your first team member to get started
          </p>
        </div>
      ) : (
        <TeamList members={members} />
      )}
    </div>
  );
}
