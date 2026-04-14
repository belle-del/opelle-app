"use client";

import { useState, type CSSProperties } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const BRASS = "#C4AB70";
const STONE_CARD = "#F5F4EC";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Achievement definitions ───────────────────────────────────── */

const ACHIEVEMENTS: Record<string, { name: string; description: string; icon: string }> = {
  first_steps: { name: "First Steps", description: "Complete your first study session", icon: "🌱" },
  consistent_7: { name: "Consistent", description: "7-day study streak", icon: "📅" },
  dedicated_30: { name: "Dedicated", description: "30-day study streak", icon: "💪" },
  quiz_master: { name: "Quiz Master", description: "Pass 20 quizzes", icon: "🧠" },
  perfect_score: { name: "Perfect Score", description: "Score 95%+ on a practice test", icon: "⭐" },
  floor_ready: { name: "Floor Ready", description: "Log 10 floor services", icon: "💇" },
  technique_growth: { name: "Technique Growth", description: "Improve 3 technique scores by 5+ points", icon: "📈" },
  domain_master: { name: "Domain Master", description: "Master all topics in a domain", icon: "👑" },
  board_prep: { name: "Board Prep", description: "Complete 5 practice tests", icon: "📋" },
  study_buddy: { name: "Study Buddy", description: "Study for 10 total hours", icon: "🤝" },
};

const ACHIEVEMENT_ORDER = [
  "first_steps",
  "consistent_7",
  "dedicated_30",
  "quiz_master",
  "perfect_score",
  "floor_ready",
  "technique_growth",
  "domain_master",
  "board_prep",
  "study_buddy",
];

/* ─── Types ─────────────────────────────────────────────────────── */

interface AchievementGridProps {
  earned: Array<{ achievementKey: string; earnedAt: string }>;
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function AchievementGrid({ earned }: AchievementGridProps) {
  const earnedMap = new Map(earned.map((e) => [e.achievementKey, e.earnedAt]));
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "16px",
          fontWeight: 600,
          color: BARK_DEEPEST,
          margin: "0 0 16px",
        }}
      >
        Achievements
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {ACHIEVEMENT_ORDER.map((key) => {
          const def = ACHIEVEMENTS[key];
          if (!def) return null;
          const earnedAt = earnedMap.get(key);
          const isEarned = !!earnedAt;
          const showTooltip = tooltip === key;

          const cardStyle: CSSProperties = {
            position: "relative",
            background: isEarned ? STONE_CARD : STONE_CARD,
            border: isEarned ? `2px solid ${BRASS}` : `1px solid ${STONE_LIGHT}`,
            borderRadius: "12px",
            padding: "16px 12px",
            textAlign: "center",
            opacity: isEarned ? 1 : 0.4,
            cursor: "default",
            transition: "all 0.2s ease",
            fontFamily: FONT_BODY,
            ...(isEarned
              ? { boxShadow: `0 0 12px ${BRASS}30` }
              : {}),
          };

          return (
            <div
              key={key}
              style={cardStyle}
              onMouseEnter={() => setTooltip(key)}
              onMouseLeave={() => setTooltip(null)}
            >
              <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>
                {def.icon}
              </span>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: BARK_DEEPEST,
                  margin: "0 0 4px",
                }}
              >
                {def.name}
              </p>
              {isEarned && earnedAt ? (
                <p style={{ fontSize: "10px", color: TEXT_FAINT, margin: 0 }}>
                  {new Date(earnedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p style={{ fontSize: "10px", color: TEXT_FAINT, margin: 0 }}>
                  {def.description}
                </p>
              )}

              {/* Tooltip */}
              {showTooltip && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: BARK_DEEPEST,
                    color: "#fff",
                    fontSize: "11px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {def.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
