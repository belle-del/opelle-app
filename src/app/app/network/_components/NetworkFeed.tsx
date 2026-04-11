"use client";

import { useState, useEffect, useCallback } from "react";
import type { NetworkPost } from "@/lib/types/network";
import { NetworkPostCard } from "./NetworkPostCard";
import { Search, Loader2 } from "lucide-react";

type Tab = "discover" | "following";

export function NetworkFeed() {
  const [tab, setTab] = useState<Tab>("discover");
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ tab });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/network/feed?${params}`);
      const data = await res.json();
      return data;
    },
    [tab]
  );

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    fetchFeed().then((data) => {
      setPosts(data.posts || []);
      setNextCursor(data.nextCursor);
      setLoading(false);
    });
  }, [fetchFeed]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchFeed(nextCursor);
    setPosts((prev) => [...prev, ...(data.posts || [])]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  }

  const tabStyle = (active: boolean) =>
    ({
      padding: "8px 20px",
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? "var(--text-on-stone)" : "var(--text-on-stone-dim)",
      background: active ? "var(--stone-card)" : "transparent",
      border: active ? "1px solid var(--stone-light)" : "1px solid transparent",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      transition: "all 0.2s var(--ease)",
    }) as const;

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <button onClick={() => setTab("discover")} style={tabStyle(tab === "discover")}>
          Discover
        </button>
        <button onClick={() => setTab("following")} style={tabStyle(tab === "following")}>
          Following
        </button>

        <div style={{ flex: 1 }} />

        <a
          href="/app/network/search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-on-stone-dim)",
            textDecoration: "none",
          }}
        >
          <Search size={16} />
          Search
        </a>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 60,
            color: "var(--text-on-stone-faint)",
          }}
        >
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-on-stone-dim)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              marginBottom: 8,
              color: "var(--text-on-stone)",
            }}
          >
            {tab === "following"
              ? "Follow stylists to see their work here"
              : "No posts yet"}
          </p>
          <p style={{ fontSize: 14 }}>
            {tab === "following"
              ? "Discover talented stylists in the Discover tab and follow those who inspire you."
              : "Be the first to share your verified work with the Opélle community."}
          </p>
        </div>
      )}

      {/* Post grid */}
      {!loading && posts.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {posts.map((post) => (
              <NetworkPostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load more */}
          {nextCursor && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: "10px 28px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-on-stone)",
                  background: "var(--stone-card)",
                  border: "1px solid var(--stone-light)",
                  borderRadius: "var(--radius-pill)",
                  cursor: loadingMore ? "wait" : "pointer",
                }}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
