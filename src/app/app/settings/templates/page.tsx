import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { seedSystemTemplates, getTemplates } from "@/lib/db/templates";
import { TemplatesList } from "./_components/TemplatesList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function TemplatesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) redirect("/app");

  // Ensure system templates exist
  await seedSystemTemplates(workspace.id);

  // Fetch all templates for this workspace
  const templates = await getTemplates(workspace.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header style={{ marginBottom: 8 }}>
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-1.5 mb-4"
          style={{
            fontSize: 11,
            color: "var(--text-on-stone-faint)",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} />
          Back to Settings
        </Link>
        <p
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--brass, #C4AB70)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 4,
          }}
        >
          Settings
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 26,
            fontWeight: 400,
            color: "var(--text-on-stone)",
            letterSpacing: "-0.01em",
          }}
        >
          Message Templates
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-on-stone-faint)",
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 4,
          }}
        >
          Manage pre-written messages for client communication.
        </p>
      </header>

      <TemplatesList templates={templates} />
    </div>
  );
}
