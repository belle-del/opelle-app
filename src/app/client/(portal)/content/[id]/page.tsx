import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getClientContext } from "@/lib/client-auth";
import { getContentPost } from "@/lib/db/content";
import { Badge } from "@/components/ui/badge";

const categoryBadgeStyles: Record<string, { background: string; color: string }> = {
  tip: { background: "var(--brass)", color: "var(--bark-deepest)" },
  product_spotlight: { background: "var(--garnet)", color: "#FFF" },
  seasonal: { background: "rgba(106,142,102,0.3)", color: "#2C5E2A" },
};

function categoryLabel(cat: string): string {
  switch (cat) {
    case "tip": return "Tip";
    case "product_spotlight": return "Product Spotlight";
    case "seasonal": return "Seasonal";
    default: return cat;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContentDetailPage({ params }: PageProps) {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const { id } = await params;
  const post = await getContentPost(id);

  if (!post || !post.publishedAt) {
    notFound();
  }

  // Verify it belongs to the client's workspace
  if (post.workspaceId !== ctx.clientUser.workspaceId) {
    notFound();
  }

  const badgeStyle = categoryBadgeStyles[post.category] || categoryBadgeStyles.tip;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/client/content"
        className="flex items-center gap-1.5"
        style={{
          fontSize: "13px",
          color: "var(--brass)",
          textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to all posts
      </Link>

      {/* Post header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default" style={{ ...badgeStyle, fontSize: "10px" }}>
            {categoryLabel(post.category)}
          </Badge>
          <span style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>
            {formatDate(post.publishedAt)}
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ fontFamily: "'Fraunces', serif", color: "#2C2C2A" }}
        >
          {post.title}
        </h1>
      </div>

      {/* Post body */}
      <div
        style={{
          fontSize: "14px",
          color: "var(--text-on-stone)",
          lineHeight: "1.7",
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: "pre-wrap",
        }}
      >
        {post.body}
      </div>
    </div>
  );
}
