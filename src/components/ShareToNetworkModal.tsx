"use client";

import { useState } from "react";
import { X, ShieldCheck, Globe, Users, Lock } from "lucide-react";
import type { PostVisibility } from "@/lib/types/network";

type ShareToNetworkModalProps = {
  open: boolean;
  onClose: () => void;
  serviceCompletionId: string;
  formulaHistoryId?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl: string;
};

export function ShareToNetworkModal({
  open,
  onClose,
  serviceCompletionId,
  formulaHistoryId,
  beforePhotoUrl,
  afterPhotoUrl,
}: ShareToNetworkModalProps) {
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  function addTag() {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/network/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceCompletionId,
          formulaHistoryId,
          beforePhotoUrl,
          afterPhotoUrl,
          caption: caption || undefined,
          tags,
          visibility,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCaption("");
          setTags([]);
        }, 1500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const visibilityOptions: { value: PostVisibility; label: string; icon: typeof Globe; desc: string }[] = [
    { value: "public", label: "Public", icon: Globe, desc: "Visible to everyone on the network" },
    { value: "network", label: "Network", icon: Users, desc: "Visible to logged-in stylists" },
    { value: "followers", label: "Followers", icon: Lock, desc: "Only your followers can see this" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--stone-lightest)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 400,
                color: "var(--text-on-stone)",
                margin: 0,
              }}
            >
              Share to Network
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--olive)",
                marginTop: 4,
              }}
            >
              <ShieldCheck size={13} />
              Linked to verified service completion
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-on-stone-dim)" }}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <ShieldCheck size={48} style={{ color: "var(--olive)", marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-on-stone)" }}>
              Posted to Opélle Network!
            </p>
          </div>
        ) : (
          <>
            {/* Photo preview */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {beforePhotoUrl && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-on-stone-dim)", marginBottom: 4 }}>
                    Before
                  </p>
                  <img
                    src={beforePhotoUrl}
                    alt="Before"
                    style={{ width: "100%", borderRadius: "var(--radius-md)", aspectRatio: "3/4", objectFit: "cover" }}
                  />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-on-stone-dim)", marginBottom: 4 }}>
                  After
                </p>
                <img
                  src={afterPhotoUrl}
                  alt="After"
                  style={{ width: "100%", borderRadius: "var(--radius-md)", aspectRatio: "3/4", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-on-stone-dim)", display: "block", marginBottom: 4 }}>
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe the transformation, technique, or story behind this service..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  border: "1px solid var(--stone-light)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--stone-card)",
                  color: "var(--text-on-stone)",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-on-stone-dim)", display: "block", marginBottom: 4 }}>
                Tags
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 12,
                      color: "var(--brass)",
                      background: "var(--stone-card)",
                      borderRadius: "var(--radius-pill)",
                      padding: "3px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    #{tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-on-stone-faint)", fontSize: 14, padding: 0, lineHeight: 1 }}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="balayage, color-correction, blonde..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  border: "1px solid var(--stone-light)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--stone-card)",
                  color: "var(--text-on-stone)",
                  outline: "none",
                }}
              />
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-on-stone-dim)", display: "block", marginBottom: 8 }}>
                Visibility
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {visibilityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      style={{
                        flex: 1,
                        padding: "10px 8px",
                        fontSize: 12,
                        fontWeight: selected ? 600 : 400,
                        color: selected ? "var(--text-on-stone)" : "var(--text-on-stone-dim)",
                        background: selected ? "var(--stone-card)" : "transparent",
                        border: selected ? "1px solid var(--brass)" : "1px solid var(--stone-light)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon size={16} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--bark-deepest)",
                background: "var(--brass)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: submitting ? "wait" : "pointer",
                transition: "opacity 0.2s",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Posting..." : "Share to Opélle Network"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
