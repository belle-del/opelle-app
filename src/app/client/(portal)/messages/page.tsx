import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MessagesFeed } from "./_components/MessagesFeed";

export default async function MessagesPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const supabase = await createSupabaseServerClient();

  const { data: notifications } = await supabase
    .from("client_notifications")
    .select("*")
    .eq("client_id", ctx.clientUser.clientId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-xl"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
        >
          Messages
        </h1>
        {notifications && notifications.length > 0 && (
          <MarkAllReadButton />
        )}
      </div>

      <MessagesFeed notifications={notifications || []} />
    </div>
  );
}

function MarkAllReadButton() {
  return (
    <form action="/api/client/messages/read-all" method="POST">
      <button
        type="submit"
        style={{
          background: "none",
          border: "none",
          color: "var(--brass)",
          fontSize: "12px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Mark all read
      </button>
    </form>
  );
}
