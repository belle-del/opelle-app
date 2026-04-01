"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignBuilder } from "./CampaignBuilder";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(241,239,224,0.08)", color: "rgba(241,239,224,0.6)" },
  scheduled: { bg: "rgba(196,171,112,0.15)", color: "#C4AB70" },
  sending: { bg: "rgba(143,173,200,0.15)", color: "#8FADC8" },
  sent: { bg: "rgba(124,184,122,0.15)", color: "#7CB87A" },
  failed: { bg: "rgba(196,122,122,0.15)", color: "#C47A7A" },
};

export function CampaignList({
  campaigns,
  onCreated,
  onUpdated,
}: {
  campaigns: Campaign[];
  onCreated: (c: Campaign) => void;
  onUpdated: (c: Campaign) => void;
}) {
  const [showBuilder, setShowBuilder] = useState(false);

  async function handleSend(id: string) {
    if (!confirm("Send this campaign now?")) return;
    const res = await fetch(`/api/marketing/campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      // Refresh the campaign
      const listRes = await fetch("/api/marketing/campaigns");
      const data = await listRes.json();
      const updated = (data.campaigns || []).find((c: Campaign) => c.id === id);
      if (updated) onUpdated(updated);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <button
          onClick={() => setShowBuilder(true)}
          style={{
            padding: "8px 14px", borderRadius: "6px",
            background: "#440606", border: "1px solid #5C0B0B",
            color: "#F1EFE0", fontSize: "11px", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          + New Campaign
        </button>
      </div>

      {campaigns.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "13px" }}>
          No campaigns yet. Create one to send messages to a group of clients.
        </div>
      )}

      {campaigns.map((campaign) => {
        const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft;
        return (
          <Card key={campaign.id}>
            <CardContent className="p-4">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "#2C2C24", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {campaign.name}
                  </p>
                  <p style={{ fontSize: "11px", color: "#8A8778", marginTop: "2px" }}>
                    {campaign.recipientsCount > 0 ? `${campaign.recipientsCount} recipients` : "No recipients yet"}
                    {campaign.sentAt && ` · Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    background: statusStyle.bg, color: statusStyle.color,
                  }}>
                    {campaign.status}
                  </span>
                  {(campaign.status === "draft" || campaign.status === "scheduled") && (
                    <button
                      onClick={() => handleSend(campaign.id)}
                      style={{
                        padding: "4px 10px", borderRadius: "4px", border: "1px solid rgba(196,171,112,0.3)",
                        background: "rgba(196,171,112,0.08)", color: "#C4AB70",
                        fontSize: "10px", cursor: "pointer",
                      }}
                    >
                      Send Now
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showBuilder && (
        <CampaignBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={(c) => { onCreated(c); setShowBuilder(false); }}
        />
      )}
    </div>
  );
}
