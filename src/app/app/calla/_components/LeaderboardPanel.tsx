"use client";

import { useEffect, useState, type CSSProperties } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_BLUSH = "#F5E1E5";
const BRASS = "#C4AB70";
const STONE_CARD = "#F5F4EC";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Types ─────────────────────────────────────────────────────── */

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  metric: number;
}

type LeaderboardType = "weekly_xp" | "streak" | "quiz_accuracy" | "most_improved";

const TABS: { key: LeaderboardType; label: string; unit: string }[] = [
  { key: "weekly_xp", label: "Weekly XP", unit: "XP" },
  { key: "streak", label: "Streaks", unit: "days" },
  { key: "quiz_accuracy", label: "Quiz Accuracy", unit: "%" },
  { key: "most_improved", label: "Most Improved", unit: "pts" },
];

/* ─── Rank badge colors ─────────────────────────────────────────── */

function getRankStyle(rank: number): CSSProperties {
  if (rank === 1) return { background: BRASS, color: "#fff" };
  if (rank === 2) return { background: "#B0B0B0", color: "#fff" };
  if (rank === 3) return { background: "#CD7F32", color: "#fff" };
  return { background: STONE_LIGHT, color: TEXT_FAINT };
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function LeaderboardPanel() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>("weekly_xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calla/leaderboard/${activeTab}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.leaderboard ?? []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const activeUnit = TABS.find((t) => t.key === activeTab)?.unit ?? "";

  return (
    <div
      style={{
        background: STONE_CARD,
        border: `1px solid ${STONE_LIGHT}`,
        borderRadius: "14px",
        padding: "24px",
        fontFamily: FONT_BODY,
      }}
    >
      {/* Header + toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "16px",
            fontWeight: 600,
            color: BARK_DEEPEST,
            margin: 0,
          }}
        >
          Leaderboard
        </h3>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: TEXT_FAINT,
            cursor: "pointer",
          }}
        >
          <span>Show me</span>
          <button
            onClick={() => setShowOnLeaderboard((v) => !v)}
            style={{
              width: "32px",
              height: "18px",
              borderRadius: "9px",
              border: "none",
              background: showOnLeaderboard ? GARNET : STONE_LIGHT,
              position: "relative",
              cursor: "pointer",
              transition: "background 0.2s ease",
              padding: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: showOnLeaderboard ? "16px" : "2px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </label>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: `1px solid ${STONE_LIGHT}`,
          marginBottom: "16px",
          overflowX: "auto",
        }}
      >
        {TABS.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontFamily: FONT_BODY,
                fontWeight: active ? 600 : 400,
                color: active ? GARNET : TEXT_FAINT,
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${GARNET}` : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                marginBottom: "-1px",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "40px",
                background: STONE_LIGHT,
                borderRadius: "8px",
                marginBottom: "8px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: TEXT_FAINT,
            fontSize: "13px",
          }}
        >
          <span style={{ fontSize: "28px", display: "block", marginBottom: "12px" }}>🏆</span>
          Leaderboards unlock when more students join!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {entries.map((entry) => {
            // V1: highlight position 1 as "current user"
            const isCurrentUser = entry.rank === 1;
            const rankStyle = getRankStyle(entry.rank);

            return (
              <div
                key={`${entry.userId}-${entry.rank}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: isCurrentUser ? GARNET_BLUSH : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Rank badge */}
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    flexShrink: 0,
                    ...rankStyle,
                  }}
                >
                  {entry.rank}
                </span>

                {/* Name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: "13px",
                    fontWeight: isCurrentUser ? 600 : 400,
                    color: BARK_DEEPEST,
                  }}
                >
                  {entry.displayName}
                  {isCurrentUser && (
                    <span style={{ fontSize: "10px", color: GARNET, marginLeft: "6px" }}>
                      (you)
                    </span>
                  )}
                </span>

                {/* Metric */}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: BRASS,
                  }}
                >
                  {entry.metric.toLocaleString()}
                  <span style={{ fontSize: "10px", color: TEXT_FAINT, marginLeft: "3px" }}>
                    {activeUnit}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
