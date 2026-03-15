import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { getOrCreateCommsPreferences } from "@/lib/db/comms-preferences";
import { ProfileForm } from "./_components/ProfileForm";
import { CommsPrefsForm } from "./_components/CommsPrefsForm";

export default async function ClientProfilePage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const commsPrefs = await getOrCreateCommsPreferences(
    ctx.clientUser.workspaceId,
    ctx.clientUser.clientId
  );

  return (
    <div className="space-y-8">
      <ProfileForm
        client={ctx.client}
        stylistName={ctx.stylistName}
        workspaceName={ctx.workspaceName}
      />
      <CommsPrefsForm initialPrefs={commsPrefs} />
    </div>
  );
}
