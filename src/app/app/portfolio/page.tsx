"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Check } from "lucide-react";
import { ShareToNetworkModal } from "@/components/ShareToNetworkModal";
import { formatDate } from "@/lib/utils";
import type { PhotoPair } from "@/lib/types";

type PortfolioItem = {
  id: string;
  studentName: string;
  categoryName: string;
  completedAt: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  notes: string | null;
  shared: boolean;
};

type PortfolioData = {
  pairs: PhotoPair[];
  stylistName: string;
  workspaceName: string;
  portfolioPublic: boolean;
} | null;

export default function PortfolioPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioData>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareItem, setShareItem] = useState<PortfolioItem | null>(null);

  // Get current user id
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch both portfolio data sources
  useEffect(() => {
    if (!userId) return;

    // Fetch legacy portfolio data (pairs + settings)
    fetch(`/api/portfolio/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.pairs) setData(d); })
      .catch(() => {});

    // Fetch portfolio items with shared status
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((d) => { if (d.items) setPortfolioItems(d.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleToggle() {
    if (!data || toggling) return;
    setToggling(true);
    const newValue = !data.portfolioPublic;
    try {
      const res = await fetch("/api/settings/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioPublic: newValue }),
      });
      if (res.ok) {
        setData((prev) => prev ? { ...prev, portfolioPublic: newValue } : prev);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    if (!userId) return;
    const url = `${window.location.origin}/stylist/${userId}/work`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareSuccess() {
    if (shareItem) {
      setPortfolioItems((prev) =>
        prev.map((item) => item.id === shareItem.id ? { ...item, shared: true } : item)
      );
    }
    setShareItem(null);
  }

  const publicUrl = userId ? `${typeof window !== "undefined" ? window.location.origin : "https://opelle.app"}/stylist/${userId}/work` : "";

  return (
    <div className="space-y-6">
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
          Portfolio
        </h2>
        <p style={{ fontSize: "12px", color: "#7A7060", marginTop: "4px" }}>
          {loading ? "Loading..." : `${portfolioItems.length || data?.pairs.length || 0} photos`}
        </p>
      </header>

      {/* Settings card */}
      <Card>
        <CardContent className="p-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "14px", color: "#2C2C24", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                Make portfolio public
              </p>
              <p style={{ fontSize: "12px", color: "#8A8778", marginTop: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                Anyone with the link can view your work
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling || !data}
              style={{
                width: "44px", height: "24px", borderRadius: "12px",
                border: "none", cursor: "pointer",
                background: data?.portfolioPublic ? "#C4AB70" : "#D4D0C8",
                transition: "background 0.2s",
                position: "relative", flexShrink: 0,
                opacity: toggling ? 0.6 : 1,
              }}
            >
              <span style={{
                position: "absolute", top: "2px",
                left: data?.portfolioPublic ? "22px" : "2px",
                width: "20px", height: "20px",
                borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
                display: "block",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </button>
          </div>

          {data?.portfolioPublic && userId && (
            <div style={{
              marginTop: "16px", padding: "10px 14px", borderRadius: "8px",
              background: "rgba(196,171,112,0.08)", border: "1px solid rgba(196,171,112,0.25)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
            }}>
              <span style={{ fontSize: "12px", color: "#5C5A4F", wordBreak: "break-all", fontFamily: "'DM Sans', sans-serif" }}>
                {publicUrl}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  padding: "4px 12px", borderRadius: "6px",
                  background: copied ? "rgba(196,171,112,0.2)" : "rgba(196,171,112,0.1)",
                  border: "1px solid rgba(196,171,112,0.2)",
                  color: "var(--brass, #C4AB70)", fontSize: "11px", cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery with network sharing */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#8A8778", fontSize: "14px" }}>
          Loading portfolio...
        </div>
      ) : portfolioItems.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
        }}>
          {portfolioItems.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                background: "var(--stone-dark, #2C2C24)",
                border: "1px solid rgba(196,171,112,0.1)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {/* Photo */}
              <div style={{ aspectRatio: "4/3", position: "relative", background: "#1A1A14" }}>
                {item.afterPhotoUrl ? (
                  <img
                    src={item.afterPhotoUrl}
                    alt="After photo"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(196,171,112,0.3)", fontSize: "12px",
                  }}>
                    No photo
                  </div>
                )}

                {/* Before overlay */}
                {item.beforePhotoUrl && item.afterPhotoUrl && (
                  <div style={{
                    position: "absolute", bottom: "8px", left: "8px",
                    width: "25%", aspectRatio: "4/3",
                    borderRadius: "6px", overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}>
                    <img
                      src={item.beforePhotoUrl}
                      alt="Before photo"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                )}
              </div>

              {/* Caption + Share Button */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: 8 }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--brass, #C4AB70)",
                    padding: "2px 8px", borderRadius: "100px",
                    border: "1px solid rgba(196,171,112,0.2)",
                  }}>
                    {item.categoryName}
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(241,239,224,0.4)" }}>
                    {formatDate(item.completedAt)}
                  </span>
                </div>

                {/* Share / Shared status */}
                {item.shared ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: "11px", color: "rgba(196,171,112,0.6)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    <Check size={12} />
                    Shared to Network
                  </div>
                ) : (
                  <button
                    onClick={() => setShareItem(item)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      width: "100%", padding: "6px 10px", borderRadius: 6,
                      border: "1px solid rgba(196,171,112,0.2)",
                      background: "rgba(196,171,112,0.06)",
                      color: "var(--brass, #C4AB70)",
                      fontSize: "11px", fontWeight: 500, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "background 0.15s",
                    }}
                  >
                    <Globe size={12} />
                    Share to Network
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BeforeAfterGallery
          pairs={data?.pairs ?? []}
          emptyMessage="No photos yet — complete color or chemical services with photos to build your portfolio."
        />
      )}

      {/* Share Modal */}
      {shareItem && shareItem.afterPhotoUrl && (
        <ShareToNetworkModal
          serviceCompletionId={shareItem.id}
          beforePhotoUrl={shareItem.beforePhotoUrl || undefined}
          afterPhotoUrl={shareItem.afterPhotoUrl}
          onClose={() => setShareItem(null)}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
}
