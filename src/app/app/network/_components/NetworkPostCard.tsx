"use client";

import { useState } from "react";
import Link from "next/link";
import type { NetworkPost } from "@/lib/types/network";
import { getVerificationTier } from "@/lib/types/network";
import { VerifiedBadge, TierBadge } from "./VerifiedBadge";
import { EngagementBar } from "./EngagementBar";

export function NetworkPostCard({ post }: { post: NetworkPost }) {
  const [showBefore, setShowBefore] = useState(false);
  const tier = getVerificationTier(post.authorTotalServices ?? 0);

  return (
    <article
      style={{
        background: "var(--stone-card)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--stone-light)",
      }}
    >
      {/* Photo */}
      <div
        style={{ position: "relative", cursor: "pointer", aspectRatio: "4/5" }}
        onClick={() => setShowBefore(!showBefore)}
      >
        <img
          src={showBefore && post.beforePhotoUrl ? post.beforePhotoUrl : post.afterPhotoUrl}
          alt={showBefore ? "Before" : "After"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Before/After label */}
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#fff",
            background: "rgba(0,0,0,0.55)",
            borderRadius: "var(--radius-pill)",
            padding: "3px 10px",
          }}
        >
          {showBefore && post.beforePhotoUrl ? "Before" : "After"}
        </span>

        {post.beforePhotoUrl && (
          <span
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              fontSize: 10,
              color: "#fff",
              background: "rgba(0,0,0,0.45)",
              borderRadius: "var(--radius-pill)",
              padding: "3px 8px",
            }}
          >
            Tap to compare
          </span>
        )}

        {/* Verified badge */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <VerifiedBadge />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        {/* Author row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          {post.authorPhotoUrl ? (
            <img
              src={post.authorPhotoUrl}
              alt=""
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--brass-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--bark-deepest)",
              }}
            >
              {(post.authorDisplayName || "S")[0].toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/app/network/stylist/${post.userId}`}
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-on-stone)",
                textDecoration: "none",
              }}
            >
              {post.authorDisplayName || "Stylist"}
            </Link>
            {post.workspaceName && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-on-stone-dim)",
                }}
              >
                {post.workspaceName}
              </div>
            )}
          </div>

          <TierBadge tier={tier} />
        </div>

        {/* Caption */}
        {post.caption && (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--text-on-stone)",
              margin: "0 0 8px",
            }}
          >
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  color: "var(--brass)",
                  background: "var(--stone-lightest)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 8px",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Engagement */}
        <EngagementBar
          postId={post.id}
          likesCount={post.likesCount}
          savesCount={post.savesCount}
          commentsCount={post.commentsCount}
          liked={post.liked ?? false}
          saved={post.saved ?? false}
        />
      </div>
    </article>
  );
}
