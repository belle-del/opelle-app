"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import { Card, CardContent } from "@/components/ui/card";
import type { PhotoPair } from "@/lib/types";

type PortfolioData = {
  pairs: PhotoPair[];
  stylistName: string;
  workspaceName: string;
  portfolioPublic: boolean;
} | null;

export default function PortfolioPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioData>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current user id
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch portfolio data once we have userId
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/portfolio/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.pairs) setData(d); })
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

  const publicUrl = userId ? `${typeof window !== "undefined" ? window.location.origin : "https://opelle.app"}/stylist/${userId}/work` : "";

  return (
    <div className="space-y-6">
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
          Portfolio
        </h2>
        <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", marginTop: "4px" }}>
          {loading ? "Loading…" : `${data?.pairs.length ?? 0} photos`}
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

      {/* Gallery */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "14px" }}>
          Loading portfolio…
        </div>
      ) : (
        <BeforeAfterGallery
          pairs={data?.pairs ?? []}
          emptyMessage="No photos yet — complete color or chemical services with photos to build your portfolio."
        />
      )}
    </div>
  );
}
