import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { getPublishedContent } from "@/lib/db/content";
import { ContentFeed } from "./_components/ContentFeed";

export default async function ContentPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const posts = await getPublishedContent(ctx.clientUser.workspaceId);

  return <ContentFeed posts={posts} />;
}
