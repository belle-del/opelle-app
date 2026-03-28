import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThreadsForWorkspace } from "@/lib/db/messaging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ threads: [] });
    }

    const threads = await getThreadsForWorkspace(workspace.id);

    // Batch-fetch client names for all threads
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
            { firstName: c.first_name, lastName: c.last_name },
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

    return NextResponse.json({ threads: threadsWithClients });
  } catch (error) {
    console.error("Failed to list threads:", error);
    return NextResponse.json(
      { error: "Failed to list threads" },
      { status: 500 }
    );
  }
}
