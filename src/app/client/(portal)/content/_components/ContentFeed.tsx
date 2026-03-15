"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentPost } from "@/lib/types";

const categoryBadgeStyles: Record<string, { background: string; color: string }> = {
  tip: { background: "var(--brass)", color: "var(--bark-deepest)" },
  product_spotlight: { background: "var(--garnet)", color: "var(--stone-lightest)" },
  seasonal: { background: "rgba(106,142,102,0.3)", color: "rgb(166,202,162)" },
};

function categoryLabel(cat: string): string {
  switch (cat) {
    case "tip": return "Tip";
    case "product_spotlight": return "Product Spotlight";
    case "seasonal": return "Seasonal";
    default: return cat;
  }
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

type Props = {
  posts: ContentPost[];
};

export function ContentFeed({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-on-stone-faint)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          No content from your stylist yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1
        className="text-2xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        From Your Stylist
      </h1>

      <div className="space-y-3">
        {posts.map((post) => {
          const badgeStyle = categoryBadgeStyles[post.category] || categoryBadgeStyles.tip;
          return (
            <Link key={post.id} href={`/client/content/${post.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ background: "var(--stone-card)" }}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <Badge
                      variant="default"
                      style={{ ...badgeStyle, fontSize: "10px" }}
                    >
                      {categoryLabel(post.category)}
                    </Badge>
                    <span style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                      {post.publishedAt ? formatShortDate(post.publishedAt) : ""}
                    </span>
                  </div>
                  <h3
                    className="text-sm mb-1"
                    style={{ fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)" }}
                  >
                    {post.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", lineHeight: "1.4" }}>
                    {post.body.length > 120 ? post.body.slice(0, 120) + "..." : post.body}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
