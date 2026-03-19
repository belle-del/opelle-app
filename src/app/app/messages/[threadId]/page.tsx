import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getThread, getMessagesForThread, markThreadRead } from "@/lib/db/messaging";
import { ThreadView } from "./_components/ThreadView";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const admin = createSupabaseAdminClient();
  let wsId: string | undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    wsId = ws?.id;
  }

  if (!wsId) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .limit(1)
      .single();
    wsId = ws?.id;
  }

  if (!wsId) redirect("/login");

  const workspace = { id: wsId };

  // Fetch thread
  const thread = await getThread(threadId);
  if (!thread || thread.workspaceId !== workspace.id) {
    redirect("/app/messages");
  }

  // Fetch messages
  const messages = await getMessagesForThread(threadId);

  // Fetch client info
  const { data: clientData } = await admin
    .from("clients")
    .select("id, first_name, last_name")
    .eq("id", thread.clientId)
    .single();

  const clientName = clientData
    ? `${clientData.first_name} ${clientData.last_name || ""}`.trim()
    : "Unknown Client";

  // Mark thread read for stylist
  await markThreadRead(threadId, "stylist");

  return (
    <ThreadView
      thread={thread}
      messages={messages}
      clientName={clientName}
      clientId={thread.clientId}
    />
  );
}
