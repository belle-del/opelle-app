import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listAvailabilityPatterns, listAvailabilityOverrides } from "@/lib/db/availability";
import { WeeklyScheduleEditor } from "./_components/WeeklyScheduleEditor";
import { OverridesPanel } from "./_components/OverridesPanel";

export default async function AvailabilityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: workspace } = await admin
    .from("workspaces")
    .select("allow_individual_availability")
    .eq("id", workspaceId)
    .single();

  const allowIndividual = workspace?.allow_individual_availability ?? false;

  const [patterns, overrides] = await Promise.all([
    listAvailabilityPatterns(workspaceId, user.id),
    listAvailabilityOverrides(workspaceId, user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
          Scheduling
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 400, color: "var(--text-on-stone, #2C2C2A)", letterSpacing: "-0.01em" }}>
          My Availability
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-on-stone-faint, #8a8880)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
          Set the days and hours you are available to take appointments.
        </p>
      </header>

      {!allowIndividual ? (
        <div style={{ padding: 16, borderRadius: 8, background: "var(--cream, #FAF8F5)", border: "1px solid var(--stone-200, #e0ddd6)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-on-stone-faint, #8a8880)" }}>
          Individual availability is managed at the workspace level. To enable per-stylist schedules, turn on <strong>Individual Stylist Availability</strong> in Settings → Booking.
        </div>
      ) : (
        <>
          <WeeklyScheduleEditor
            workspaceId={workspaceId}
            userId={user.id}
            initialPatterns={patterns}
          />
          <OverridesPanel
            workspaceId={workspaceId}
            userId={user.id}
            initialOverrides={overrides}
          />
        </>
      )}
    </div>
  );
}
