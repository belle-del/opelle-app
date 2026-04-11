"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { NetworkPost, NetworkComment } from "@/lib/types/network";
import { getVerificationTier } from "@/lib/types/network";
import { VerifiedBadge, TierBadge } from "../../_components/VerifiedBadge";
import { EngagementBar } from "../../_components/EngagementBar";
import { ArrowLeft, Loader2, Send } from "lucide-react";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<NetworkPost | null>(null);
  const [comments, setComments] = useState<NetworkComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBefore, setShowBefore] = useState(false);

  useEffect(() => {
    fetch(`/api/network/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPost(data.post);
        setComments(data.comments || []);
        setLoading(false);
      });
  }, [id]);

  async function handleComment() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/network/posts/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-on-stone-faint)" }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "var(--text-on-stone-dim)" }}>
        Post not found
      </div>
    );
  }

  const tier = getVerificationTier(post.authorTotalServices ?? 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Back link */}
      <Link
        href="/app/network"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text-on-stone-dim)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to feed
      </Link>

      {/* Photo comparison */}
      <div
        style={{
          position: "relative",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          marginBottom: 20,
          cursor: post.beforePhotoUrl ? "pointer" : "default",
        }}
        onClick={() => post.beforePhotoUrl && setShowBefore(!showBefore)}
      >
        <img
          src={showBefore && post.beforePhotoUrl ? post.beforePhotoUrl : post.afterPhotoUrl}
          alt={showBefore ? "Before" : "After"}
          style={{ width: "100%", display: "block", maxHeight: 600, objectFit: "cover" }}
        />
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span
            style={{
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
        </div>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <VerifiedBadge />
        </div>
      </div>

      {/* Author + content */}
      <div
        style={{
          background: "var(--stone-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--stone-light)",
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {post.authorPhotoUrl ? (
            <img
              src={post.authorPhotoUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--brass-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--bark-deepest)",
              }}
            >
              {(post.authorDisplayName || "S")[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <Link
              href={`/app/network/stylist/${post.userId}`}
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-on-stone)",
                textDecoration: "none",
              }}
            >
              {post.authorDisplayName || "Stylist"}
            </Link>
            {post.workspaceName && (
              <div style={{ fontSize: 12, color: "var(--text-on-stone-dim)" }}>
                {post.workspaceName}
              </div>
            )}
          </div>
          <TierBadge tier={tier} />
        </div>

        {post.caption && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-on-stone)", margin: "0 0 12px" }}>
            {post.caption}
          </p>
        )}

        {post.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
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

        <EngagementBar
          postId={post.id}
          likesCount={post.likesCount}
          savesCount={post.savesCount}
          commentsCount={comments.length}
          liked={post.liked ?? false}
          saved={post.saved ?? false}
        />
      </div>

      {/* Comments */}
      <div
        style={{
          background: "var(--stone-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--stone-light)",
          padding: 20,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-on-stone)",
            margin: "0 0 16px",
          }}
        >
          Comments ({comments.length})
        </h3>

        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-on-stone-faint)", margin: "0 0 16px" }}>
            No comments yet. Be the first to share your thoughts.
          </p>
        )}

        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 14,
              paddingLeft: comment.parentCommentId ? 32 : 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--stone-light)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-on-stone-dim)",
              }}
            >
              {(comment.authorDisplayName || "?")[0].toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-on-stone)" }}>
                {comment.authorDisplayName || "Stylist"}
              </span>
              <p style={{ fontSize: 13, color: "var(--text-on-stone)", margin: "2px 0 0", lineHeight: 1.5 }}>
                {comment.content}
              </p>
            </div>
          </div>
        ))}

        {/* Comment input */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={2000}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--stone-light)",
              borderRadius: "var(--radius-md)",
              background: "var(--stone-lightest)",
              color: "var(--text-on-stone)",
              outline: "none",
            }}
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim() || submitting}
            style={{
              padding: "8px 14px",
              background: "var(--brass)",
              color: "var(--bark-deepest)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: submitting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
