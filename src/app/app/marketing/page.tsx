"use client";

import { useState, useEffect } from "react";
import { AutomationList } from "./_components/AutomationList";
import { CampaignList } from "./_components/CampaignList";
import { MessageLog } from "./_components/MessageLog";
import type { AutomationRule, Campaign, MessageLog as MessageLogType } from "@/lib/types";

type Tab = "automations" | "campaigns" | "log";

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>("automations");
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<MessageLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/marketing/automations").then((r) => r.json()),
      fetch("/api/marketing/campaigns").then((r) => r.json()),
      fetch("/api/marketing/logs?limit=50").then((r) => r.json()),
    ])
      .then(([aData, cData, lData]) => {
        setAutomations(aData.rules || []);
        setCampaigns(cData.campaigns || []);
        setLogs(lData.logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "automations", label: "Automations", count: automations.length },
    { key: "campaigns", label: "Campaigns", count: campaigns.length },
    { key: "log", label: "Message Log", count: logs.length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C4AB70", marginBottom: "4px" }}>
          Practice
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#FAF8F3", fontWeight: 300 }}>
          Marketing
        </h2>
        <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", marginTop: "4px" }}>
          Automations, campaigns, and message history
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(196,171,112,0.12)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px",
              fontSize: "12px",
              color: tab === t.key ? "#C4AB70" : "rgba(241,239,224,0.5)",
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #C4AB70" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "color 0.15s",
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ marginLeft: "6px", fontSize: "10px", opacity: 0.5 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : (
        <>
          {tab === "automations" && (
            <AutomationList
              automations={automations}
              onUpdate={(updated) => setAutomations(automations.map((a) => a.id === updated.id ? updated : a))}
              onCreated={(rule) => setAutomations([rule, ...automations])}
              onDeleted={(id) => setAutomations(automations.filter((a) => a.id !== id))}
            />
          )}
          {tab === "campaigns" && (
            <CampaignList
              campaigns={campaigns}
              onCreated={(c) => setCampaigns([c, ...campaigns])}
              onUpdated={(c) => setCampaigns(campaigns.map((x) => x.id === c.id ? c : x))}
            />
          )}
          {tab === "log" && <MessageLog logs={logs} />}
        </>
      )}
    </div>
  );
}
