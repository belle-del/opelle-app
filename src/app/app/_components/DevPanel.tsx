"use client";

import { useState, useRef, useEffect } from "react";
import { useDevMode } from "@/lib/dev-context";
import type { ViewMode, ConsoleEntry, NetworkEntry } from "@/lib/dev-context";

const MODES: ViewMode[] = ["god", "school", "salon", "practitioner", "client"];

const MODE_COLORS: Record<ViewMode, string> = {
  god:          "#9B7FE8",
  school:       "#C4AB70",
  salon:        "#8FADC8",
  practitioner: "#7CB87A",
  client:       "#C47A7A",
};

const LEVEL_COLORS: Record<string, string> = {
  log:   "rgba(241,239,224,0.6)",
  info:  "#8FADC8",
  warn:  "#C4AB70",
  error: "#C47A7A",
};

type PanelTab = "mode" | "console" | "network" | "context";

export function DevPanel({ userId, workspaceId, workspaceName }: {
  userId?: string;
  workspaceId?: string;
  workspaceName?: string;
}) {
  const { viewMode, setViewMode, consoleLogs, networkLogs, clearLogs, panelOpen, setPanelOpen } = useDevMode();
  const [tab, setTab] = useState<PanelTab>("mode");
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "console") {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs, tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setPanelOpen]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: panelOpen ? "#2C2C24" : MODE_COLORS[viewMode],
          border: "2px solid rgba(255,255,255,0.15)",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
          fontFamily: "monospace",
        }}
        title={`Dev Mode: ${viewMode}`}
      >
        {panelOpen ? "\u2715" : "\u2699"}
      </button>

      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.3)",
          }}
        />
      )}

      {/* Slide-out panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "380px",
          zIndex: 9999,
          background: "#1A1A14",
          borderLeft: "1px solid rgba(196,171,112,0.15)",
          transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', monospace",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(196,171,112,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(196,171,112,0.7)" }}>
              Dev Mode
            </span>
            <span style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: MODE_COLORS[viewMode] + "22",
              color: MODE_COLORS[viewMode],
              border: `1px solid ${MODE_COLORS[viewMode]}44`,
              fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {viewMode}
            </span>
          </div>
          <button
            onClick={clearLogs}
            style={{
              fontSize: "10px",
              color: "rgba(241,239,224,0.3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Clear
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid rgba(196,171,112,0.1)",
          flexShrink: 0,
        }}>
          {(["mode", "console", "network", "context"] as PanelTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid #C4AB70" : "2px solid transparent",
                color: tab === t ? "#C4AB70" : "rgba(241,239,224,0.4)",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {t}
              {t === "console" && consoleLogs.length > 0 && (
                <span style={{ marginLeft: "4px", color: "rgba(241,239,224,0.3)" }}>
                  {consoleLogs.length}
                </span>
              )}
              {t === "network" && networkLogs.length > 0 && (
                <span style={{ marginLeft: "4px", color: "rgba(241,239,224,0.3)" }}>
                  {networkLogs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {tab === "mode" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11px", color: "rgba(241,239,224,0.4)", marginBottom: "4px" }}>
                Simulate how the nav looks for each account type
              </p>
              {MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1px solid ${viewMode === mode ? MODE_COLORS[mode] + "66" : "rgba(241,239,224,0.08)"}`,
                    background: viewMode === mode ? MODE_COLORS[mode] + "18" : "rgba(241,239,224,0.03)",
                    color: viewMode === mode ? MODE_COLORS[mode] : "rgba(241,239,224,0.7)",
                    fontSize: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ textTransform: "capitalize", fontWeight: viewMode === mode ? 600 : 400 }}>
                    {mode === "god" ? "God Mode" :
                     mode === "school" ? "School (Teacher)" :
                     mode === "salon" ? "Salon (Owner)" :
                     mode === "practitioner" ? "Practitioner (Solo)" :
                     "Client"}
                  </span>
                  {viewMode === mode && (
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>active</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === "console" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {consoleLogs.length === 0 && (
                <p style={{ fontSize: "11px", color: "rgba(241,239,224,0.3)", textAlign: "center", paddingTop: "24px" }}>
                  No logs yet
                </p>
              )}
              {consoleLogs.map((entry) => (
                <ConsoleRow key={entry.id} entry={entry} />
              ))}
              <div ref={consoleEndRef} />
            </div>
          )}

          {tab === "network" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {networkLogs.length === 0 && (
                <p style={{ fontSize: "11px", color: "rgba(241,239,224,0.3)", textAlign: "center", paddingTop: "24px" }}>
                  No requests yet
                </p>
              )}
              {[...networkLogs].reverse().map((entry) => (
                <NetworkRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {tab === "context" && (
            <ContextTab
              userId={userId}
              workspaceId={workspaceId}
              workspaceName={workspaceName}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ConsoleRow({ entry }: { entry: ConsoleEntry }) {
  const color = LEVEL_COLORS[entry.level] || "rgba(241,239,224,0.6)";
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div style={{
      display: "flex",
      gap: "8px",
      padding: "3px 0",
      borderBottom: "1px solid rgba(241,239,224,0.04)",
      alignItems: "flex-start",
    }}>
      <span style={{ fontSize: "9px", color: "rgba(241,239,224,0.25)", whiteSpace: "nowrap", marginTop: "1px", minWidth: "52px" }}>
        {time}
      </span>
      <span style={{ fontSize: "9px", color, minWidth: "32px", textTransform: "uppercase", marginTop: "1px" }}>
        {entry.level}
      </span>
      <span style={{ fontSize: "10px", color, wordBreak: "break-all", lineHeight: 1.5, fontFamily: "monospace" }}>
        {entry.message}
      </span>
    </div>
  );
}

function NetworkRow({ entry }: { entry: NetworkEntry }) {
  const isError = entry.status !== null && (entry.status === -1 || entry.status >= 400);
  const isInFlight = entry.status === null;
  const statusColor = isInFlight ? "#C4AB70" : isError ? "#C47A7A" : "#7CB87A";
  const shortUrl = entry.url.replace(/^https?:\/\/[^/]+/, "");
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{
      display: "flex",
      gap: "8px",
      padding: "4px 0",
      borderBottom: "1px solid rgba(241,239,224,0.04)",
      alignItems: "flex-start",
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: "9px", color: "rgba(241,239,224,0.25)", whiteSpace: "nowrap", marginTop: "2px", minWidth: "52px" }}>
        {time}
      </span>
      <span style={{
        fontSize: "9px",
        fontWeight: 600,
        color: entry.method === "GET" ? "#8FADC8" : "#C4AB70",
        minWidth: "36px",
        marginTop: "2px",
      }}>
        {entry.method}
      </span>
      <span style={{ fontSize: "10px", color: "rgba(241,239,224,0.7)", wordBreak: "break-all", flex: 1, fontFamily: "monospace", lineHeight: 1.4 }}>
        {shortUrl}
      </span>
      <span style={{
        fontSize: "10px",
        color: statusColor,
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontFamily: "monospace",
      }}>
        {isInFlight ? "\u00B7\u00B7\u00B7" : entry.status === -1 ? "ERR" : entry.status}
        {entry.duration !== null && (
          <span style={{ fontSize: "9px", fontWeight: 400, color: "rgba(241,239,224,0.3)", marginLeft: "4px" }}>
            {entry.duration}ms
          </span>
        )}
      </span>
    </div>
  );
}

function ContextTab({ userId, workspaceId, workspaceName, viewMode }: {
  userId?: string;
  workspaceId?: string;
  workspaceName?: string;
  viewMode: ViewMode;
}) {
  const rows: [string, string | undefined][] = [
    ["viewMode", viewMode],
    ["userId", userId],
    ["workspaceId", workspaceId],
    ["workspaceName", workspaceName],
    ["env", process.env.NODE_ENV],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {rows.map(([key, value]) => (
        <div key={key} style={{
          display: "flex",
          gap: "12px",
          padding: "6px 0",
          borderBottom: "1px solid rgba(241,239,224,0.06)",
          alignItems: "baseline",
        }}>
          <span style={{ fontSize: "10px", color: "rgba(241,239,224,0.4)", minWidth: "110px", fontFamily: "monospace" }}>
            {key}
          </span>
          <span style={{ fontSize: "10px", color: "#C4AB70", fontFamily: "monospace", wordBreak: "break-all" }}>
            {value ?? "\u2014"}
          </span>
        </div>
      ))}
    </div>
  );
}
