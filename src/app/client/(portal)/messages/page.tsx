import { redirect } from "next/navigation";
import Link from "next/link";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThreadsForClient, getMessagesForThread } from "@/lib/db/messaging";
import { MessagesFeed } from "./_components/MessagesFeed";

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function MessagesPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const supabase = await createSupabaseServerClient();

  // Fetch notifications and threads in parallel
  const [{ data: notifications }, threads] = await Promise.all([
    supabase
      .from("client_notifications")
      .select("*")
      .eq("client_id", ctx.clientUser.clientId)
      .order("created_at", { ascending: false }),
    getThreadsForClient(ctx.clientUser.clientId),
  ]);

  // For each thread, fetch the latest message for preview
  const threadsWithPreview = await Promise.all(
    threads.map(async (thread) => {
      const messages = await getMessagesForThread(thread.id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      return { thread, lastMessage };
    })
  );

  // Filter out stylist_message notifications since those are now in threads
  const filteredNotifications = (notifications || []).filter(
    (n: { type: string }) => n.type !== "stylist_message"
  );

  const hasThreads = threadsWithPreview.length > 0;
  const hasNotifications = filteredNotifications.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-xl"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
        >
          Messages
        </h1>
        {hasNotifications && <MarkAllReadButton />}
      </div>

      {/* Conversations Section */}
      {hasThreads && (
        <div className="space-y-2">
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--stone-lightest)",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase" as const,
            }}
          >
            Conversations
          </h2>
          <div className="space-y-2">
            {threadsWithPreview.map(({ thread, lastMessage }) => {
              const isUnread = thread.unreadClient > 0;
              return (
                <Link
                  key={thread.id}
                  href={`/client/messages/${thread.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      background: isUnread ? "var(--stone-lightest)" : "var(--stone-card)",
                      borderLeft: isUnread ? "3px solid var(--brass)" : "3px solid transparent",
                      borderRadius: "8px",
                      padding: "12px 14px",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Chat icon */}
                      <div className="mt-0.5 flex-shrink-0">
                        <svg
                          width={16}
                          height={16}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--text-on-stone-dim)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            style={{
                              fontSize: "13px",
                              color: "var(--text-on-stone)",
                              fontWeight: isUnread ? 600 : 500,
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {ctx.stylistName}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isUnread && (
                              <span
                                style={{
                                  background: "var(--brass)",
                                  color: "var(--bark-deepest)",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  borderRadius: "10px",
                                  padding: "1px 7px",
                                  minWidth: "18px",
                                  textAlign: "center" as const,
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                {thread.unreadClient}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--text-on-stone-ghost)",
                              }}
                            >
                              {formatRelativeDate(thread.lastMessageAt)}
                            </span>
                          </div>
                        </div>
                        {lastMessage && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text-on-stone-faint)",
                              marginTop: "2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap" as const,
                            }}
                          >
                            {lastMessage.senderType === "client" ? "You: " : ""}
                            {lastMessage.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {hasThreads && hasNotifications && (
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            color: "var(--stone-lightest)",
            fontSize: "14px",
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "uppercase" as const,
          }}
        >
          Notifications
        </h2>
      )}

      <MessagesFeed notifications={filteredNotifications} />
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
