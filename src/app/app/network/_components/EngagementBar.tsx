"use client";

import { useState } from "react";
import { Heart, Bookmark, MessageCircle } from "lucide-react";

export function EngagementBar({
  postId,
  likesCount,
  savesCount,
  commentsCount,
  liked: initialLiked,
  saved: initialSaved,
  onCommentClick,
}: {
  postId: string;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  liked: boolean;
  saved: boolean;
  onCommentClick?: () => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likes, setLikes] = useState(likesCount);
  const [saves, setSaves] = useState(savesCount);

  async function handleLike() {
    setLiked(!liked);
    setLikes((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/network/posts/${postId}/like`, {
        method: "POST",
      });
      const data = await res.json();
      setLiked(data.liked);
    } catch {
      setLiked(liked);
      setLikes(likesCount);
    }
  }

  async function handleSave() {
    setSaved(!saved);
    setSaves((c) => (saved ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/network/posts/${postId}/save`, {
        method: "POST",
      });
      const data = await res.json();
      setSaved(data.saved);
    } catch {
      setSaved(saved);
      setSaves(savesCount);
    }
  }

  const btnStyle = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "var(--text-on-stone-dim)",
    padding: "4px 0",
  } as const;

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <button onClick={handleLike} style={btnStyle}>
        <Heart
          size={18}
          fill={liked ? "var(--garnet)" : "none"}
          color={liked ? "var(--garnet)" : "var(--text-on-stone-dim)"}
        />
        {likes > 0 && <span>{likes}</span>}
      </button>

      <button onClick={handleSave} style={btnStyle}>
        <Bookmark
          size={18}
          fill={saved ? "var(--brass)" : "none"}
          color={saved ? "var(--brass)" : "var(--text-on-stone-dim)"}
        />
        {saves > 0 && <span>{saves}</span>}
      </button>

      <button onClick={onCommentClick} style={btnStyle}>
        <MessageCircle size={18} />
        {commentsCount > 0 && <span>{commentsCount}</span>}
      </button>
    </div>
  );
}
