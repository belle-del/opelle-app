import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { ClientPortalShell } from "./_components/ClientPortalShell";

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

  return (
    <ClientPortalShell
      clientFirstName={ctx.client.firstName}
      stylistName={ctx.stylistName}
    >
      {children}
    </ClientPortalShell>
  );
}
