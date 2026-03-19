"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { ContentPost } from "@/lib/types";

const categoryBadgeStyles: Record<string, { background: string; color: string }> = {
  tip: { background: "rgba(196,171,112,0.12)", color: "var(--brass-warm)" },
  product_spotlight: { background: "rgba(68,6,6,0.1)", color: "var(--garnet-ruby)" },
  seasonal: { background: "rgba(91,138,90,0.1)", color: "#5B8A5A" },
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
        <FileText
          style={{
            width: "32px",
            height: "32px",
            color: "#7A7A72",
            margin: "0 auto 12px",
          }}
        />
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-on-stone-faint)",
            fontFamily: "'Fraunces', serif",
            marginBottom: "4px",
          }}
        >
          No content yet
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#7A7A72",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Tips, product spotlights, and seasonal updates from your stylist will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1
        style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24" }}
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
