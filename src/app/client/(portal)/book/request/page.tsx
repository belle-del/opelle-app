import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { RequestForm } from "./_components/RequestForm";

export default async function RequestPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  return (
    <RequestForm
      clientId={ctx.clientUser.clientId}
      workspaceId={ctx.clientUser.workspaceId}
    />
  );
}
