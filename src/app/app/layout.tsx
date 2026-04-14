import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { AppNav } from "./_components/AppNav";
import MetisFloatingChat from "./_components/MetisFloatingChat";
import { DevWrapper } from "./_components/DevWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";

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

  // Get workspace (supports both owners and team members via membership fallback)
  const workspace = await getCurrentWorkspace();

  const GOD_MODE_EMAIL = "belle@dominusfoundry.com";
  const showDevTools = user.email === GOD_MODE_EMAIL;

  return (
    <ThemeProvider theme={workspace?.theme ?? null}>
    <DevWrapper
      showDevTools={showDevTools}
      userId={user.id}
      workspaceId={workspace?.id}
      workspaceName={workspace?.name}
    >
      <div className="min-h-screen flex">
        <AppNav user={user} workspaceName={workspace?.name} workspaceType={workspace?.type} />
        <main className="flex-1 ml-0 md:ml-[170px] pt-[60px] md:pt-6 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
        <MetisFloatingChat />
      </div>
    </DevWrapper>
    </ThemeProvider>
  );
}
