"use client";

import type { CSSProperties } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const GARNET = "#6B2737";
const BRASS = "#C4AB70";
const STONE_CARD = "#F5F4EC";
const STONE_MID = "#D5D3C3";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Level data ────────────────────────────────────────────────── */

const LEVEL_THRESHOLDS = [0, 100, 350, 750, 1500, 3000, 5500, 9000, 14000, 20000, 25000];
const LEVEL_NAMES = [
  "Beginner",
  "Apprentice",
  "Developing",
  "Intermediate",
  "Advancing",
  "Proficient",
  "Skilled",
  "Advanced",
  "Expert",
  "Board Ready",
];

function getStreakMultiplier(streak: number): string {
  if (streak >= 30) return "2x";
  if (streak >= 14) return "1.5x";
  if (streak >= 7) return "1.25x";
  return "1x";
}

/* ─── Types ─────────────────────────────────────────────────────── */

interface ProgressionCardProps {
  progression: {
    totalXp: number;
    currentLevel: number;
    currentStreak: number;
    longestStreak: number;
    streakFreezesAvailable: number;
    lastActivityDate: string | null;
  };
  summary?: {
    totalSessions: number;
    totalStudyMinutes: number;
  };
}

/* ─── SVG Level Ring ────────────────────────────────────────────── */

function LevelRing({ level, xp }: { level: number; xp: number }) {
  const cappedLevel = Math.min(level, LEVEL_THRESHOLDS.length - 1);
  const currentThreshold = LEVEL_THRESHOLDS[cappedLevel] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[cappedLevel + 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  const progress = xpForLevel > 0 ? Math.min(xpInLevel / xpForLevel, 1) : 1;

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STONE_MID}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={BRASS}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {/* Level number in center */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "32px",
            fontWeight: 700,
            color: BARK_DEEPEST,
            lineHeight: 1,
          }}
        >
          {cappedLevel}
        </span>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: "9px",
            fontWeight: 500,
            color: TEXT_FAINT,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginTop: "2px",
          }}
        >
          Level
        </span>
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function ProgressionCard({ progression, summary }: ProgressionCardProps) {
  const { totalXp, currentLevel, currentStreak, longestStreak, streakFreezesAvailable } = progression;
  const cappedLevel = Math.min(currentLevel, LEVEL_THRESHOLDS.length - 1);
  const levelName = LEVEL_NAMES[cappedLevel] ?? "Beginner";
  const nextThreshold = LEVEL_THRESHOLDS[cappedLevel + 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpToNext = Math.max(nextThreshold - totalXp, 0);
  const multiplier = getStreakMultiplier(currentStreak);

  const card: CSSProperties = {
    background: STONE_CARD,
    border: `1px solid ${STONE_LIGHT}`,
    borderRadius: "14px",
    padding: "24px",
    fontFamily: FONT_BODY,
  };

  const sectionDivider: CSSProperties = {
    borderTop: `1px solid ${STONE_LIGHT}`,
    margin: "20px 0",
  };

  return (
    <div style={card}>
      {/* ─── Level + XP ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <LevelRing level={currentLevel} xp={totalXp} />
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "18px",
              fontWeight: 600,
              color: BARK_DEEPEST,
              margin: "0 0 4px",
            }}
          >
            {levelName}
          </p>
          <p
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: BRASS,
              margin: "0 0 4px",
              lineHeight: 1,
            }}
          >
            {totalXp.toLocaleString()} XP
          </p>
          <p style={{ fontSize: "12px", color: TEXT_FAINT, margin: 0 }}>
            {currentLevel < LEVEL_THRESHOLDS.length - 1
              ? `${xpToNext.toLocaleString()} XP to next level`
              : "Max level reached!"}
          </p>
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ─── Streak ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "22px" }} role="img" aria-label="streak">
            🔥
          </span>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "20px",
              fontWeight: 700,
              color: BARK_DEEPEST,
            }}
          >
            {currentStreak} day{currentStreak !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Multiplier badge */}
        <span
          style={{
            background: multiplier !== "1x" ? GARNET : STONE_LIGHT,
            color: multiplier !== "1x" ? "#fff" : TEXT_FAINT,
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "20px",
          }}
        >
          {multiplier} XP
        </span>

        {/* Streak freezes */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            color: TEXT_FAINT,
            marginLeft: "auto",
          }}
        >
          ❄️ {streakFreezesAvailable} freeze{streakFreezesAvailable !== 1 ? "s" : ""}
        </span>
      </div>

      <p style={{ fontSize: "11px", color: TEXT_FAINT, margin: "8px 0 0" }}>
        Longest streak: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
      </p>

      {/* ─── Summary stats ─── */}
      {summary && (
        <>
          <div style={sectionDivider} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "22px",
                  fontWeight: 700,
                  color: BARK_DEEPEST,
                  margin: "0 0 2px",
                }}
              >
                {summary.totalSessions}
              </p>
              <p style={{ fontSize: "11px", color: TEXT_FAINT, margin: 0 }}>Total Sessions</p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "22px",
                  fontWeight: 700,
                  color: BARK_DEEPEST,
                  margin: "0 0 2px",
                }}
              >
                {(summary.totalStudyMinutes / 60).toFixed(1)}h
              </p>
              <p style={{ fontSize: "11px", color: TEXT_FAINT, margin: 0 }}>Study Hours</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
