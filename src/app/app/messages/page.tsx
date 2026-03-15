import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getThreadsForWorkspace } from "@/lib/db/messaging";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ThreadList } from "./_components/ThreadList";
import { ComposeDialog } from "./_components/ComposeDialog";

export default async function MessagesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) redirect("/app");

  // Fetch threads
  const threads = await getThreadsForWorkspace(workspace.id);

  // Batch-fetch client names
  const clientIds = [...new Set(threads.map((t) => t.clientId))];
  let clientMap: Record<string, { firstName: string; lastName: string }> = {};

  if (clientIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data: clients } = await admin
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    if (clients) {
      clientMap = Object.fromEntries(
        clients.map((c) => [
          c.id,
          { firstName: c.first_name, lastName: c.last_name || "" },
        ])
      );
    }
  }

  const threadsWithClients = threads.map((t) => ({
    ...t,
    clientName: clientMap[t.clientId]
      ? `${clientMap[t.clientId].firstName} ${clientMap[t.clientId].lastName}`.trim()
      : "Unknown Client",
  }));

  // Count total unread
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadStylist, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p
            style={{
              fontSize: "9px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-on-bark-faint)",
              marginBottom: "4px",
            }}
          >
            Communication
          </p>
          <div className="flex items-center gap-3">
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "24px",
                color: "var(--text-on-bark)",
                fontWeight: 300,
              }}
            >
              Messages
            </h2>
            {totalUnread > 0 && (
              <Badge variant="warning">{totalUnread} unread</Badge>
            )}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-on-bark-faint)",
              marginTop: "4px",
            }}
          >
            {threadsWithClients.length}{" "}
            {threadsWithClients.length === 1 ? "conversation" : "conversations"}
          </p>
        </div>
        <ComposeDialog workspaceId={workspace.id} />
      </header>

      {/* Thread List */}
      {threadsWithClients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageCircle
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "var(--text-on-stone-ghost)" }}
            />
            <h3
              style={{
                fontSize: "14px",
                fontFamily: "'Fraunces', serif",
                color: "var(--text-on-stone)",
                fontWeight: 400,
                marginBottom: "8px",
              }}
            >
              No conversations yet
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-on-stone-faint)",
                marginBottom: "16px",
              }}
            >
              Start a conversation with a client to keep in touch.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ThreadList threads={threadsWithClients} />
      )}
    </div>
  );
}
