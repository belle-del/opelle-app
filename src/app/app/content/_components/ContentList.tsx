"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

type ContentPost = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  tip: {
    label: "Tip",
    color: "var(--brass-warm)",
    bg: "rgba(196,171,112,0.12)",
  },
  product_spotlight: {
    label: "Product Spotlight",
    color: "var(--garnet-ruby)",
    bg: "rgba(68,6,6,0.1)",
  },
  seasonal: {
    label: "Seasonal",
    color: "#5B8A5A",
    bg: "rgba(91,138,90,0.1)",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ContentListProps {
  posts: ContentPost[];
}

export function ContentList({ posts }: ContentListProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const cat = CATEGORY_STYLES[post.category] || {
          label: post.category,
          color: "var(--text-on-stone-faint)",
          bg: "rgba(0,0,0,0.04)",
        };
        const isPublished = post.status === "published";
        const displayDate = isPublished && post.published_at
          ? post.published_at
          : post.created_at;

        return (
          <Card
            key={post.id}
            style={{ cursor: "pointer", marginBottom: "8px" }}
            onClick={() => router.push(`/app/content/${post.id}/edit`)}
          >
            <CardContent style={{ padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-on-stone)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {post.title}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-on-stone-faint)",
                      marginTop: "2px",
                      marginBottom: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {post.body.slice(0, 80)}
                    {post.body.length > 80 ? "..." : ""}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  {/* Category badge */}
                  <span
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "100px",
                      color: cat.color,
                      background: cat.bg,
                    }}
                  >
                    {cat.label}
                  </span>
                  {/* Status badge */}
                  <span
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "100px",
                      color: isPublished
                        ? "var(--status-confirmed)"
                        : "var(--text-on-stone-faint)",
                      background: isPublished
                        ? "rgba(143,173,200,0.12)"
                        : "rgba(0,0,0,0.04)",
                    }}
                  >
                    {isPublished ? "Published" : "Draft"}
                  </span>
                  {/* Date */}
                  <span
                    className="hidden sm:block"
                    style={{
                      fontSize: "9px",
                      color: "var(--text-on-stone-faint)",
                    }}
                  >
                    {formatDate(displayDate)}
                  </span>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "var(--text-on-stone-ghost)" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
