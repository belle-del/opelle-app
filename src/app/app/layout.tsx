import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "./_components/AppNav";
import MetisFloatingChat from "./_components/MetisFloatingChat";

export const metadata: Metadata = {
  title: "Practitioner Suite",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <AppNav user={user} workspaceName={workspace?.name} />

      {/* Main content — offset for sidebar on desktop, top bar on mobile */}
      <main className="flex-1 ml-0 md:ml-[170px] pt-[60px] md:pt-6 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      <MetisFloatingChat />
    </div>
  );
}
