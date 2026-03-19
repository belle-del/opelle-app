"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Loader2 } from "lucide-react";
import { ContentList } from "./_components/ContentList";

type ContentPost = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export default function ContentPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data.posts) ? data.posts : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--brass, #C4AB70)",
              marginBottom: "4px",
            }}
          >
            Practice
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "26px",
              color: "var(--stone-lightest, #FAF8F3)",
              fontWeight: 300,
            }}
          >
            Content
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-on-bark, #F5F0E8)",
              marginTop: "4px",
            }}
          >
            Share tips and updates with your clients.
          </p>
        </div>
        <Link href="/app/content/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </header>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          <Loader2
            style={{
              width: "24px",
              height: "24px",
              color: "var(--text-on-bark-ghost)",
            }}
            className="animate-spin"
          />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "48px", textAlign: "center" }}>
            <FileText
              style={{
                width: "32px",
                height: "32px",
                margin: "0 auto 12px",
                color: "var(--text-on-stone-ghost)",
              }}
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
              No content yet
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-on-stone-faint)",
                marginBottom: "16px",
              }}
            >
              Share tips and updates with your clients.
            </p>
            <Link href="/app/content/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ContentList posts={posts} />
      )}
    </div>
  );
}
