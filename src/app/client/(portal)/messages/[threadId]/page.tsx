import { redirect, notFound } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { getThread, getMessagesForThread, markThreadRead } from "@/lib/db/messaging";
import { ClientThreadView } from "./_components/ClientThreadView";

type Props = {
  params: Promise<{ threadId: string }>;
};

export default async function ThreadPage({ params }: Props) {
  const { threadId } = await params;

  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const thread = await getThread(threadId);
  if (!thread || thread.clientId !== ctx.clientUser.clientId) {
    notFound();
  }

  const messages = await getMessagesForThread(threadId);

  // Mark thread as read for the client
  await markThreadRead(threadId, "client");

  return (
    <ClientThreadView
      messages={messages}
      threadId={threadId}
      stylistName={ctx.stylistName}
    />
  );
}
