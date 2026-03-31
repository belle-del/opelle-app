"use client";

import { useState, useEffect } from "react";
import { InspoTab } from "./InspoTab";
import { ClientMessagesTab } from "./ClientMessagesTab";
import { HistoryTab } from "./HistoryTab";
import type { MessageThread, Message, Appointment } from "@/lib/types";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";

type ThreadWithMessages = {
  thread: MessageThread;
  messages: Message[];
};

type Props = {
  clientId: string;
  clientName: string;
  children: React.ReactNode; // The existing content (formulas, etc.)
  threads?: ThreadWithMessages[];
  appointments?: Appointment[];
};

type InspoSubmission = {
  id: string;
  client_notes: string | null;
  ai_analysis: {
    feasibility: string;
    clientSummary: string;
    stylistFlag: string | null;
    requiresConsult: boolean;
    generatedFormQuestions: { id: string; question: string; type: string; options?: string[] }[];
    demandSignals: { direction: string; productHint?: string; confidence: string }[];
  } | null;
  stylist_flag: string | null;
  feasibility: string | null;
  client_summary: string | null;
  requires_consult: boolean;
  reviewed_by_stylist: boolean;
  created_at: string;
  photoUrls: string[];
  consultAnswers?: Record<string, unknown> | null;
};

export function ClientDetailTabs({ clientId, clientName, children, threads = [], appointments = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"formulas" | "photos" | "inspo" | "messages" | "history">("formulas");
  const [inspoSubmissions, setInspoSubmissions] = useState<InspoSubmission[]>([]);
  const [inspoLoaded, setInspoLoaded] = useState(false);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [photoPairs, setPhotoPairs] = useState<import("@/lib/types").PhotoPair[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const photosLoading = activeTab === "photos" && !photosLoaded;

  useEffect(() => {
    // Fetch inspo data
    fetch(`/api/inspo?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInspoSubmissions(data);
          setUnreviewedCount(
            data.filter((s: InspoSubmission) => s.requires_consult && !s.reviewed_by_stylist).length
          );
        }
      })
      .catch(() => {})
      .finally(() => setInspoLoaded(true));
  }, [clientId]);

  useEffect(() => {
    if (activeTab !== "photos" || photosLoaded) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/photos`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (data.pairs && Array.isArray(data.pairs)) {
            setPhotoPairs(data.pairs);
          }
          setPhotosLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPhotosLoaded(true);
      });
    return () => { cancelled = true; };
  }, [activeTab, clientId, photosLoaded]);

  // Count unread messages from clients
  const unreadMessages = threads.reduce(
    (sum, t) => sum + (t.thread.unreadStylist ?? 0),
    0
  );

  const tabs = [
    { id: "formulas" as const, label: "Formulas" },
    { id: "photos" as const, label: "Photos" },
    { id: "history" as const, label: "History" },
    {
      id: "inspo" as const,
      label: "Inspo",
      badge: unreviewedCount > 0 ? unreviewedCount : undefined,
    },
    {
      id: "messages" as const,
      label: "Messages",
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-white/10 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium transition-all relative"
            style={{
              color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid var(--brass, #D4B76A)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
            {tab.badge && (
              <span
                className="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  background: "var(--garnet, #440606)",
                  color: "white",
                  minWidth: "18px",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "formulas" && children}

      {activeTab === "photos" && (
        photosLoading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "rgba(241,239,224,0.4)", fontSize: "14px" }}>
            Loading photos…
          </div>
        ) : (
          <BeforeAfterGallery
            pairs={photoPairs}
            emptyMessage="No photos yet — photos from color and chemical services appear here after completion."
          />
        )
      )}

      {activeTab === "history" && (
        <HistoryTab
          clientName={clientName}
          appointments={appointments}
        />
      )}

      {activeTab === "inspo" && (
        inspoLoaded ? (
          <InspoTab
            clientId={clientId}
            clientName={clientName}
            submissions={inspoSubmissions}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading inspo...</p>
          </div>
        )
      )}

      {activeTab === "messages" && (
        <ClientMessagesTab
          threads={threads}
          clientId={clientId}
        />
      )}
    </div>
  );
}
