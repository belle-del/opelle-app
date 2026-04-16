import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ClientPortalShell } from "./_components/ClientPortalShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { WorkspaceTheme } from "@/lib/types";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getClientContext();

  if (!ctx) {
    redirect("/client/join");
  }

  // Fetch workspace theme separately
  const admin = createSupabaseAdminClient();
  const { data: workspace } = await admin
    .from("workspaces")
    .select("theme")
    .eq("id", ctx.clientUser.workspaceId)
    .single();

  const theme: WorkspaceTheme | null = (workspace?.theme as WorkspaceTheme) ?? null;

  return (
    <ThemeProvider theme={theme}>
      <ClientPortalShell
        clientFirstName={ctx.client.firstName}
        stylistName={ctx.stylistName}
      >
        {children}
      </ClientPortalShell>
    </ThemeProvider>
  );
}
