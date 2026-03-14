import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { ProfileForm } from "./_components/ProfileForm";

export default async function ClientProfilePage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  return (
    <ProfileForm
      client={ctx.client}
      stylistName={ctx.stylistName}
      workspaceName={ctx.workspaceName}
    />
  );
}
