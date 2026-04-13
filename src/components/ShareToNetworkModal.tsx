"use client";

import { useState } from "react";
import { X, Check, Globe, Users, UserCheck, Loader2 } from "lucide-react";
import type { PostVisibility } from "@/lib/types/network";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";
const GREEN = "#4A7C59";

const TAG_OPTIONS = [
  "Color",
  "Highlights",
  "Balayage",
  "Extensions",
  "Cut & Style",
  "Texture",
  "Blowout",
  "Vivids",
  "Corrective Color",
];

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; description: string; icon: typeof Globe }[] = [
  { value: "public", label: "Public", description: "Anyone on the network", icon: Globe },
  { value: "network", label: "Network Only", description: "Verified stylists only", icon: Users },
  { value: "followers", label: "Followers Only", description: "People who follow you", icon: UserCheck },
];

interface ShareToNetworkModalProps {
  serviceCompletionId: string;
  beforePhotoUrl?: string;
  afterPhotoUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShareToNetworkModal({
  serviceCompletionId,
  beforePhotoUrl,
  afterPhotoUrl,
  onClose,
  onSuccess,
}: ShareToNetworkModalProps) {
  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleShare() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/network/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceCompletionId,
          beforePhotoUrl,
          afterPhotoUrl,
          caption: caption.trim() || undefined,
          tags: selectedTags.map((t) => t.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")),
          visibility,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to share");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)",
        }}
        onClick={onSuccess}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff", borderRadius: 16, padding: "48px 32px",
            maxWidth: 400, width: "90%", textAlign: "center",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: GREEN,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Check size={32} color="#fff" />
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600,
            color: TEXT_MAIN, margin: "0 0 8px",
          }}>
            Shared to Network
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14,
            color: TEXT_FAINT, margin: "0 0 24px",
          }}>
            Your work is now live on the Opelle Network.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={onSuccess}
              style={{
                padding: "10px 20px", borderRadius: 8,
                border: "1px solid " + STONE_MID, background: "#fff",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", color: TEXT_MAIN,
              }}
            >
              Done
            </button>
            <a
              href="/app/network"
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: GARNET, color: "#fff", fontSize: 14,
                fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", textDecoration: "none",
                display: "inline-flex", alignItems: "center",
              }}
            >
              View on Network
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16,
          maxWidth: 520, width: "90%", maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 0",
        }}>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600,
            color: TEXT_MAIN, margin: 0,
          }}>
            Share to Network
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: TEXT_FAINT,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          {/* Before / After Photos */}
          <div style={{
            display: "grid",
            gridTemplateColumns: beforePhotoUrl ? "1fr 1fr" : "1fr",
            gap: 12, marginBottom: 20,
          }}>
            {beforePhotoUrl && (
              <div>
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                  textTransform: "uppercase" as const, color: TEXT_FAINT,
                  marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
                }}>
                  Before
                </p>
                <div style={{
                  borderRadius: 10, overflow: "hidden", aspectRatio: "3/4",
                  border: "1px solid " + STONE_MID,
                }}>
                  <img
                    src={beforePhotoUrl}
                    alt="Before"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>
            )}
            <div>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase" as const, color: TEXT_FAINT,
                marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
              }}>
                After
              </p>
              <div style={{
                borderRadius: 10, overflow: "hidden", aspectRatio: "3/4",
                border: "1px solid " + STONE_MID,
              }}>
                <img
                  src={afterPhotoUrl}
                  alt="After"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>

          {/* Caption */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", fontSize: 11, color: TEXT_FAINT,
              marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500, letterSpacing: "0.02em",
            }}>
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell the story behind this transformation..."
              maxLength={500}
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid " + STONE_MID, background: CREAM,
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: TEXT_MAIN, resize: "vertical" as const,
              }}
            />
            <p style={{
              fontSize: 11, color: TEXT_FAINT, textAlign: "right" as const,
              marginTop: 4, fontFamily: "'DM Sans', sans-serif",
            }}>
              {caption.length}/500
            </p>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", fontSize: 11, color: TEXT_FAINT,
              marginBottom: 8, fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500, letterSpacing: "0.02em",
            }}>
              Tags
            </label>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {TAG_OPTIONS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      border: active ? "1.5px solid " + BRASS : "1px solid " + STONE_MID,
                      background: active ? BRASS + "18" : "transparent",
                      color: active ? BRASS : TEXT_FAINT,
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block", fontSize: 11, color: TEXT_FAINT,
              marginBottom: 8, fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500, letterSpacing: "0.02em",
            }}>
              Visibility
            </label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = visibility === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 10,
                      border: active ? "1.5px solid " + BRASS : "1px solid " + STONE_MID,
                      background: active ? BRASS + "10" : "transparent",
                      cursor: "pointer", textAlign: "left" as const,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={16} color={active ? BRASS : TEXT_FAINT} />
                    <div>
                      <p style={{
                        fontSize: 13, fontWeight: 500, color: TEXT_MAIN,
                        margin: 0, fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {opt.label}
                      </p>
                      <p style={{
                        fontSize: 11, color: TEXT_FAINT, margin: 0,
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: 13, color: "#B91C1C", marginBottom: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 10,
                border: "1px solid " + STONE_MID, background: "#fff",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", color: TEXT_MAIN,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={submitting}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 10,
                border: "none", background: submitting ? STONE_MID : BRASS,
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sharing...
                </>
              ) : (
                "Share"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
